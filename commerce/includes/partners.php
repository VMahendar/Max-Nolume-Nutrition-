<?php
defined('ABSPATH') || exit;
const MVN_FIELDS = ['business', 'contact', 'phone', 'gstin', 'address', 'city', 'state', 'pincode', 'business_type', 'brands', 'monthly_quantity'];
add_shortcode('mvn_partner_application', function () {
    if (!is_user_logged_in()) return '<p>Register or sign in through My Account to apply.</p>';
    ob_start(); ?>
    <p>Application status: <?php echo esc_html(get_user_meta(get_current_user_id(), '_mvn_application_status', true) ?: 'Not submitted'); ?>. Approval is required for partner pricing.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
    <input type="hidden" name="action" value="mvn_apply">
    <?php wp_nonce_field('mvn_apply'); foreach (MVN_FIELDS as $field): ?>
    <p><label><?php echo esc_html(ucwords(str_replace('_', ' ', $field))); ?>
    <input name="<?php echo esc_attr($field); ?>" maxlength="500" <?php echo $field === 'gstin' ? '' : 'required'; ?>></label></p>
    <?php endforeach; ?><button type="submit">Submit partner application</button></form>
    <?php return ob_get_clean();
});
add_action('admin_post_mvn_apply', function () {
    if (!is_user_logged_in()) wp_die('Sign in required', '', ['response' => 401]);
    check_admin_referer('mvn_apply');
    $id = get_current_user_id();
    if (mvn_tier() !== 'retail') wp_die('Contact support to change an approved account.');
    $data = [];
    foreach (MVN_FIELDS as $field) {
        $value = sanitize_text_field(wp_unslash($_POST[$field] ?? ''));
        if (strlen($value) > 500 || ($field !== 'gstin' && !$value)) wp_die('Complete all required fields.');
        $data[$field] = $value;
    }
    if (!preg_match('/^[1-9][0-9]{5}$/', $data['pincode'])) wp_die('Invalid Indian pincode.');
    if (!preg_match('/^[+0-9 ()-]{10,20}$/', $data['phone'])) wp_die('Invalid phone.');
    if ($data['gstin'] && !preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', $data['gstin'])) wp_die('Invalid GSTIN format.');
    if (!ctype_digit($data['monthly_quantity']) || (int)$data['monthly_quantity'] < 1) wp_die('Invalid quantity.');
    if (time() - (int)get_user_meta($id, '_mvn_application_time', true) < 300) wp_die('Wait five minutes before resubmitting.', '', ['response' => 429]);
    update_user_meta($id, '_mvn_application', $data);
    update_user_meta($id, '_mvn_application_status', 'pending');
    update_user_meta($id, '_mvn_application_time', time());
    wp_mail(get_option('admin_email'), 'Max Volume partner application', 'A partner application is pending review in WordPress Users.');
    wp_safe_redirect(wc_get_page_permalink('myaccount')); exit;
});
function mvn_partner_admin($user) {
    if (!current_user_can('manage_woocommerce') || !current_user_can('edit_user', $user->ID)) return;
    echo '<h2>Partner review</h2><pre>' . esc_html(wp_json_encode(get_user_meta($user->ID, '_mvn_application', true), JSON_PRETTY_PRINT)) . '</pre>';
    wp_nonce_field('mvn_approve_' . $user->ID, 'mvn_approval_nonce');
    echo '<label>Tier <select name="mvn_tier">';
    foreach (['retail', 'gym', 'dealer'] as $tier) echo '<option ' . selected(mvn_tier($user), $tier, false) . '>' . esc_html($tier) . '</option>';
    echo '</select></label><p>Verify business documents before approval. Retail revokes access.</p>';
}
add_action('show_user_profile', 'mvn_partner_admin');
add_action('edit_user_profile', 'mvn_partner_admin');
foreach (['personal_options_update', 'edit_user_profile_update'] as $hook) add_action($hook, function ($id) {
    if (!isset($_POST['mvn_tier']) || !current_user_can('manage_woocommerce') || !current_user_can('edit_user', $id)) return;
    check_admin_referer('mvn_approve_' . $id, 'mvn_approval_nonce');
    $tier = sanitize_key($_POST['mvn_tier']);
    if (!in_array($tier, ['retail', 'gym', 'dealer'], true)) return;
    $user = get_userdata($id);
    $user->remove_role('mvn_gym'); $user->remove_role('mvn_dealer');
    if ($tier !== 'retail') $user->add_role('mvn_' . $tier);
    update_user_meta($id, '_mvn_application_status', $tier === 'retail' ? 'not approved' : 'approved ' . $tier);
    wp_mail($user->user_email, 'Max Volume partner status', 'Your account status is now: ' . ($tier === 'retail' ? 'retail / not approved' : 'approved ' . $tier) . '. Sign in to My Account to review.');
    add_user_meta($id, '_mvn_approval_audit', ['actor' => get_current_user_id(), 'time' => time(), 'tier' => $tier]);
});
