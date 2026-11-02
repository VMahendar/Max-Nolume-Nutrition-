<?php
defined('ABSPATH') || exit;
// Safe, idempotent draft seeding. Never overwrites existing products or invents stock.
function mvn_seed_catalogue() {
    $rows = [
        ['MVN-WHEY-CHOC-5LB', 'Unicorn Potency Whey 5 lbs Chocolate', '4999'],
        ['MVN-WHEY-COFFEE-5LB', 'Unicorn Potency Whey 5 lbs Coffee', '4999'],
        ['MVN-PRE-250G', 'Unicorn Sturdy Pre-Workout 250 g', '1399'],
        ['MVN-MASS-5KG', 'Unicorn Nitro Mass 5 kg', '3499'],
        ['MVN-MASS-3KG', 'Unicorn Nitro Mass 3 kg', '2599'],
        ['MVN-CREATINE-BLUE-100G', 'Unicorn Creatine 100 g Blueberry', '899'],
        ['MVN-CREATINE-CRAN-100G', 'Unicorn Creatine 100 g Cranberry', '899'],
        ['MVN-MULTI', 'Unicorn Multivitamin', '699'],
    ];
    $attributes = ['brand' => 'Brand', 'flavour' => 'Flavour', 'pack' => 'Pack size'];
    foreach ($attributes as $slug => $label) {
        if (!wc_attribute_taxonomy_id_by_name($slug)) wc_create_attribute(['name' => $label, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false]);
        if (!taxonomy_exists('pa_' . $slug)) register_taxonomy('pa_' . $slug, ['product'], ['public' => false, 'hierarchical' => false]);
    }
    $details = [
        'MVN-WHEY-CHOC-5LB' => ['whey', 'Chocolate', '5 lbs'],
        'MVN-WHEY-COFFEE-5LB' => ['whey', 'Coffee', '5 lbs'],
        'MVN-PRE-250G' => ['pre-workout', '', '250 g'],
        'MVN-MASS-5KG' => ['gainers', '', '5 kg'],
        'MVN-MASS-3KG' => ['gainers', '', '3 kg'],
        'MVN-CREATINE-BLUE-100G' => ['creatine', 'Blueberry', '100 g'],
        'MVN-CREATINE-CRAN-100G' => ['creatine', 'Cranberry', '100 g'],
        'MVN-MULTI' => ['vitamins', '', ''],
    ];
    foreach ($rows as [$sku, $name, $price]) {
        if (wc_get_product_id_by_sku($sku)) continue;
        $p = new WC_Product_Simple();
        $p->set_sku($sku); $p->set_name($name); $p->set_regular_price($price);
        $p->set_status('draft'); $p->set_manage_stock(true); $p->set_stock_quantity(0);
        $p->set_stock_status('outofstock'); $p->set_tax_status('taxable');
        $p->update_meta_data('_mvn_review_required', 'Verify manufacturer, images, MRP, HSN/GST, stock, batch/expiry, ingredients and directions before publication.');
        [$category, $flavour, $pack] = $details[$sku];
        $term = term_exists($category, 'product_cat') ?: wp_insert_term(ucwords(str_replace('-', ' ', $category)), 'product_cat', ['slug' => $category]);
        if (!is_wp_error($term)) $p->set_category_ids([(int)(is_array($term) ? $term['term_id'] : $term)]);
        $attrs = [];
        foreach (['brand' => 'Unicorn Pro Series', 'flavour' => $flavour, 'pack' => $pack] as $slug => $value) {
            if (!$value) continue;
            $tax = 'pa_' . $slug;
            $term = term_exists($value, $tax) ?: wp_insert_term($value, $tax);
            if (is_wp_error($term)) continue;
            $a = new WC_Product_Attribute();
            $a->set_id(wc_attribute_taxonomy_id_by_name($slug)); $a->set_name($tax);
            $a->set_options([(int)(is_array($term) ? $term['term_id'] : $term)]); $a->set_visible(true); $a->set_variation(false);
            $attrs[] = $a;
        }
        $p->set_attributes($attrs);
        $p->save();
    }
}
if (defined('WP_CLI') && WP_CLI) WP_CLI::add_command('mvn seed', function () { mvn_seed_catalogue(); WP_CLI::success('Missing SKUs created as out-of-stock drafts; existing products unchanged.'); });
add_action('woocommerce_product_options_pricing', function () {
    if (!current_user_can('manage_woocommerce')) return;
    foreach (['gym', 'dealer'] as $tier) {
        woocommerce_wp_text_input(['id' => '_mvn_' . $tier . '_price', 'label' => ucfirst($tier) . ' price (private)', 'type' => 'number', 'custom_attributes' => ['min' => '0', 'step' => '0.01']]);
        woocommerce_wp_text_input(['id' => '_mvn_' . $tier . '_moq', 'label' => ucfirst($tier) . ' minimum quantity', 'type' => 'number', 'custom_attributes' => ['min' => '1', 'step' => '1']]);
    }
    woocommerce_wp_text_input(['id' => '_mvn_allowed_tiers', 'label' => 'Allowed tiers', 'description' => 'Empty = all; otherwise comma-separated retail,gym,dealer.']);
    woocommerce_wp_text_input(['id' => '_mvn_purchase_cost', 'label' => 'Private purchase cost', 'type' => 'number', 'custom_attributes' => ['min' => '0', 'step' => '0.01']]);
});
add_action('woocommerce_admin_process_product_object', function ($p) {
    if (!current_user_can('manage_woocommerce')) return;
    foreach (['gym', 'dealer'] as $tier) foreach (['price', 'moq'] as $field) {
        $key = '_mvn_' . $tier . '_' . $field;
        if (isset($_POST[$key])) {
            $value = sanitize_text_field(wp_unslash($_POST[$key]));
            if ($value === '' || (is_numeric($value) && $value >= ($field === 'moq' ? 1 : 0))) $p->update_meta_data($key, $value);
        }
    }
    if (isset($_POST['_mvn_purchase_cost'])) $p->update_meta_data('_mvn_purchase_cost', max(0, (float)$_POST['_mvn_purchase_cost']));
    if (isset($_POST['_mvn_allowed_tiers'])) {
        $tiers = array_intersect(['retail', 'gym', 'dealer'], array_map('trim', explode(',', sanitize_text_field(wp_unslash($_POST['_mvn_allowed_tiers'])))));
        $p->update_meta_data('_mvn_allowed_tiers', implode(',', $tiers));
    }
});
add_shortcode('mvn_storefront', function () {
    $path = dirname(__DIR__) . '/storefront/index.html';
    if (!file_exists($path)) return '<p>Build the storefront assets before installing this plugin.</p>';
    $html = file_get_contents($path);
    preg_match('~<body>(.*)</body>~s', $html, $matches);
    $body = str_replace('href="policies.html"', 'href="' . esc_url(home_url('/policies/')) . '"', $matches[1] ?? '');
    $body = preg_replace('~<script.*?</script>~s', '', $body);
    wp_enqueue_style('mvn-store', plugins_url('storefront/style.css', dirname(__DIR__) . '/max-volume-commerce.php'), [], '1.0.0');
    wp_enqueue_script('mvn-store', plugins_url('storefront/app.js', dirname(__DIR__) . '/max-volume-commerce.php'), [], '1.0.0', true);
    $products = [];
    // Only public retail products belong in the public marketing shell. Tier-only products stay in Woo's authenticated catalogue.
    foreach (wc_get_products(['status' => 'publish', 'limit' => 100, 'orderby' => 'ID', 'order' => 'ASC']) as $p) {
        if (strpos($p->get_sku(), 'MVN-') !== 0 || $p->get_price() === '') continue;
        if ($p->get_meta('_mvn_allowed_tiers') && !in_array('retail', explode(',', $p->get_meta('_mvn_allowed_tiers')), true)) continue;
        $products[$p->get_sku()] = ['url' => get_permalink($p->get_id()), 'available' => $p->is_in_stock(), 'price' => (float)wc_get_price_to_display($p)];
    }
    wp_add_inline_script('mvn-store', 'window.MVN_COMMERCE=' . wp_json_encode(['products' => $products, 'priceLabel' => mvn_tier() === 'retail' ? 'Retail' : ucfirst(mvn_tier()) . ' partner', 'account' => wc_get_page_permalink('myaccount'), 'cart' => wc_get_cart_url(), 'shop' => wc_get_page_permalink('shop')]) . ';', 'before');
    return $body;
});
