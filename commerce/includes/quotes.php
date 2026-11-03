<?php
defined('ABSPATH') || exit;
add_action('init', function () {
    register_post_status('wc-mvn-quote', ['label' => 'Quote requested', 'public' => false, 'show_in_admin_all_list' => true, 'show_in_admin_status_list' => true, 'label_count' => _n_noop('Quote requested (%s)', 'Quote requested (%s)')]);
});
add_filter('wc_order_statuses', function ($statuses) { $statuses['wc-mvn-quote'] = 'Quote requested'; return $statuses; });
add_shortcode('mvn_quote_request', function () {
    if (!is_user_logged_in()) return '<p>Sign in to request a recorded quote.</p>';
    ob_start(); ?>
    <h2>Request a quote</h2><p>This creates a non-payable quote in your account. Shipping, tax and availability require review.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
    <input type="hidden" name="action" value="mvn_quote">
    <?php wp_nonce_field('mvn_quote'); ?>
    <label>Product <select name="product" required>
    <?php foreach (wc_get_products(['status' => 'publish', 'limit' => 100]) as $p) {
        if (!$p->is_type('simple') || !mvn_allowed($p)) continue;
        echo '<option value="' . esc_attr($p->get_id()) . '">' . esc_html($p->get_name()) . '</option>';
    } ?></select></label>
    <label>Quantity <input type="number" name="quantity" min="1" max="999" required></label>
    <button>Request quote</button></form>
    <?php return ob_get_clean();
});
add_action('admin_post_mvn_quote', function () {
    if (!is_user_logged_in()) wp_die('Sign in required.', '', ['response' => 401]);
    check_admin_referer('mvn_quote');
    $id = get_current_user_id();
    // Atomic, persisted lock also prevents concurrent duplicate submissions.
    $lock = 'mvn_quote_lock_' . $id;
    $last = (int)get_option($lock, 0);
    if ($last && time() - $last >= 300) delete_option($lock);
    if (!add_option($lock, time(), '', false)) wp_die('Wait five minutes before another request.', '', ['response' => 429]);
    $p = wc_get_product(absint($_POST['product'] ?? 0));
    $raw_qty = wp_unslash($_POST['quantity'] ?? '');
    if (!is_string($raw_qty) || !ctype_digit($raw_qty)) wp_die('Invalid quantity.');
    $qty = (int)$raw_qty;
    if (!$p || $p->get_status() !== 'publish' || !$p->is_type('simple') || $qty < 1 || $qty > 999 || mvn_cart_error($p, $qty)) wp_die('Invalid product, account or quantity.');
    $order = wc_create_order(['customer_id' => $id, 'status' => 'mvn-quote', 'created_via' => 'mvn_quote']);
    if (is_wp_error($order)) wp_die('Quote service unavailable. Please contact support.');
    try {
        $order->add_product($p, $qty);
        $order->update_meta_data('_mvn_quote_tier', mvn_tier());
        $order->update_meta_data('_mvn_tier', mvn_tier());
        $order->add_order_note('Quote request only. Verify stock, tier, tax and shipping before converting to a payable order.');
        $order->calculate_totals(false);
        $order->save();
    } catch (Throwable $error) {
        $order->delete(true);
        wp_die('Quote could not be saved. Please contact support.');
    }
    wp_mail(get_option('admin_email'), 'Max Volume quote request #' . $order->get_id(), 'A customer quote is awaiting review in WooCommerce Orders.');
    wp_mail(wp_get_current_user()->user_email, 'Max Volume quote received #' . $order->get_id(), 'Your request is recorded in My Account. It is not a payment confirmation.');
    wp_safe_redirect($order->get_view_order_url()); exit;
});
// Pay-for-order must obey the same explicit enablement gate as checkout.
add_action('woocommerce_before_pay_action', function ($order) {
    if (get_option('mvn_checkout_enabled', 'no') !== 'yes') throw new Exception('Payments are awaiting configuration.');
    $tier = $order->get_meta('_mvn_tier');
    if ($tier && $tier !== mvn_tier()) throw new Exception('Account tier changed; request a revised order.');
    foreach ($order->get_items() as $item) {
        $p = $item->get_product();
        if (!$p || !mvn_allowed($p) || mvn_cart_error($p, $item->get_quantity()) || $p->get_meta('_mvn_review_required')) throw new Exception('A product requires review.');
    }
});
