<?php
defined('ABSPATH') || exit;
// A standalone template avoids inheriting an unrelated theme's header and branding.
add_filter('template_include', function ($template) {
    global $post;
    if (is_woocommerce() || is_cart() || is_checkout() || is_account_page() || ($post && (has_shortcode($post->post_content, 'mvn_storefront') || has_shortcode($post->post_content, 'mvn_partner_application') || has_shortcode($post->post_content, 'mvn_quote_request')))) return dirname(__DIR__) . '/templates/commerce.php';
    return $template;
}, 99);
add_action('wp_enqueue_scripts', function () {
    global $post;
    $shell = $post && has_shortcode($post->post_content, 'mvn_storefront');
    $partner = $post && (has_shortcode($post->post_content, 'mvn_partner_application') || has_shortcode($post->post_content, 'mvn_quote_request'));
    if ($shell) wp_enqueue_style('mvn-store', plugins_url('storefront/style.css', dirname(__DIR__) . '/max-volume-commerce.php'), [], '1.0.0');
    if ($partner || is_woocommerce() || is_cart() || is_checkout() || is_account_page()) {
        wp_enqueue_style('mvn-native', plugins_url('assets/commerce.css', dirname(__DIR__) . '/max-volume-commerce.php'), [], '1.0.0');
    }
});
add_action('woocommerce_before_shop_loop', function () {
    ?>
    <form method="get" class="mvn-filters" action="<?php echo esc_url(wc_get_page_permalink('shop')); ?>">
    <label>Search <input name="s" value="<?php echo esc_attr(get_search_query()); ?>"></label><input type="hidden" name="post_type" value="product">
    <?php foreach (['product_cat' => 'Category', 'pa_brand' => 'Brand', 'pa_flavour' => 'Flavour', 'pa_pack' => 'Pack size'] as $tax => $label) {
        if (!taxonomy_exists($tax)) continue;
        $name = $tax === 'product_cat' ? 'product_cat' : 'filter_' . substr($tax, 3);
        echo '<label>' . esc_html($label) . '<select name="' . esc_attr($name) . '"><option value="">All</option>';
        foreach (get_terms(['taxonomy' => $tax, 'hide_empty' => true]) as $term) echo '<option value="' . esc_attr($term->slug) . '" ' . selected(sanitize_text_field(wp_unslash($_GET[$name] ?? '')), $term->slug, false) . '>' . esc_html($term->name) . '</option>';
        echo '</select></label>';
    } ?>
    <label>Minimum ₹ <input type="number" name="min_price" min="0" value="<?php echo esc_attr(sanitize_text_field(wp_unslash($_GET['min_price'] ?? ''))); ?>"></label>
    <label>Maximum ₹ <input type="number" name="max_price" min="0" value="<?php echo esc_attr(sanitize_text_field(wp_unslash($_GET['max_price'] ?? ''))); ?>"></label>
    <label>Availability <select name="mvn_stock"><option value="">All stock states</option><option value="instock" <?php selected($_GET['mvn_stock'] ?? '', 'instock'); ?>>In stock</option></select></label>
    <button>Apply filters</button><a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>">Reset</a></form>
    <?php
}, 5);
add_filter('woocommerce_product_query_meta_query', function ($query) {
    if (($_GET['mvn_stock'] ?? '') === 'instock') $query[] = ['key' => '_stock_status', 'value' => 'instock'];
    return $query;
});
add_action('wp_head', function () {
    if (is_woocommerce() || is_cart() || is_checkout() || is_account_page()) {
        echo '<meta name="theme-color" content="#061421">';
        // Canonical domain is always the current configured WordPress home; no invented domain.
        if (is_shop()) echo '<link rel="canonical" href="' . esc_url(get_pagenum_link(max(1, get_query_var('paged')))) . '">';
    }
});
