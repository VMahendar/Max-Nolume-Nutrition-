<?php
/**
 * Plugin Name: Max Volume Nutrition Commerce
 * Description: WooCommerce retail and approved partner integration.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 */
defined('ABSPATH') || exit;
add_action('init', function () {
    add_role('mvn_gym', 'Approved gym partner', ['read' => true]);
    add_role('mvn_dealer', 'Approved wholesale dealer', ['read' => true]);
});
function mvn_tier($user = null) {
    $user = $user ?: wp_get_current_user();
    foreach (['dealer', 'gym'] as $tier) if (in_array('mvn_' . $tier, $user->roles, true)) return $tier;
    return 'retail';
}
function mvn_allowed($product) {
    $allowed = $product->get_meta('_mvn_allowed_tiers');
    if (!$allowed && $product->get_parent_id()) {
        $parent = wc_get_product($product->get_parent_id());
        $allowed = $parent ? $parent->get_meta('_mvn_allowed_tiers') : '';
    }
    return !$allowed || in_array(mvn_tier(), explode(',', $allowed), true);
}
function mvn_price($price, $product) {
    if (!mvn_allowed($product)) return '';
    if (mvn_tier() === 'retail') return $price;
    $value = $product->get_meta('_mvn_' . mvn_tier() . '_price');
    return $value !== '' && is_numeric($value) && $value >= 0 ? $value : $price;
}
foreach (['woocommerce_product_get_price', 'woocommerce_product_variation_get_price', 'woocommerce_product_get_sale_price', 'woocommerce_product_variation_get_sale_price', 'woocommerce_variation_prices_price', 'woocommerce_variation_prices_sale_price'] as $hook) add_filter($hook, 'mvn_price', 99, 2);
add_filter('woocommerce_get_variation_prices_hash', function ($hash) { $hash['mvn_tier'] = mvn_tier(); return $hash; });
add_filter('woocommerce_product_is_visible', function ($ok, $id) { $p = wc_get_product($id); return $ok && $p && mvn_allowed($p); }, 99, 2);
foreach (['woocommerce_is_purchasable', 'woocommerce_variation_is_purchasable'] as $hook) add_filter($hook, function ($ok, $p) { return $ok && mvn_allowed($p); }, 99, 2);
function mvn_cart_error($product, $qty) {
    if (!mvn_allowed($product)) return 'This item is unavailable for your account.';
    $moq = max(1, (int)$product->get_meta('_mvn_' . mvn_tier() . '_moq'));
    return $qty < $moq ? sprintf('Minimum quantity for %s is %d.', $product->get_name(), $moq) : '';
}
add_filter('woocommerce_add_to_cart_validation', function ($ok, $id, $qty, $variation = 0) {
    $p = wc_get_product($variation ?: $id);
    if (!$p) return false;
    foreach (WC()->cart->get_cart() as $line) if ($line['data']->get_id() === $p->get_id()) $qty += $line['quantity'];
    $error = mvn_cart_error($p, $qty);
    if ($error) { wc_add_notice($error, 'error'); return false; }
    return $ok;
}, 99, 4);
add_action('woocommerce_check_cart_items', function () {
    foreach (WC()->cart->get_cart() as $line) {
        $error = mvn_cart_error($line['data'], $line['quantity']);
        if ($error) wc_add_notice($error, 'error');
    }
});
add_action('woocommerce_before_calculate_totals', function ($cart) {
    foreach ($cart->get_cart() as $line) {
        $fresh = wc_get_product($line['data']->get_id());
        $line['data']->set_price(mvn_price($fresh->get_price('edit'), $fresh));
    }
}, 99);
add_action('template_redirect', function () {
    if (is_user_logged_in()) { if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true); nocache_headers(); }
});
// Do not expose private metadata, even to API product consumers.
add_filter('woocommerce_rest_prepare_product_object', function ($response) {
    $data = $response->get_data();
    $data['meta_data'] = array_values(array_filter($data['meta_data'] ?? [], function ($m) {
        $key = is_object($m) ? ($m->key ?? '') : ($m['key'] ?? '');
        return strpos($key, '_mvn_') !== 0;
    }));
    $response->set_data($data); return $response;
});
require_once __DIR__ . '/includes/partners.php';
require_once __DIR__ . '/includes/catalogue.php';

// Tier-only products must be excluded from SQL queries, not just card rendering.
function mvn_catalogue_meta_query($query) {
    $query[] = ['relation' => 'OR',
        ['key' => '_mvn_allowed_tiers', 'compare' => 'NOT EXISTS'],
        ['key' => '_mvn_allowed_tiers', 'value' => '', 'compare' => '='],
        ['key' => '_mvn_allowed_tiers', 'value' => '(^|,)' . mvn_tier() . '(,|$)', 'compare' => 'REGEXP']];
    return $query;
}
add_filter('woocommerce_product_query_meta_query', 'mvn_catalogue_meta_query');
add_filter('woocommerce_store_api_product_query', function ($args) {
    $args['meta_query'] = mvn_catalogue_meta_query($args['meta_query'] ?? []); return $args;
});
add_action('template_redirect', function () {
    if (is_product()) {
        $p = wc_get_product(get_queried_object_id());
        if ($p && !mvn_allowed($p)) { global $wp_query; $wp_query->set_404(); status_header(404); nocache_headers(); include get_404_template(); exit; }
    }
});
add_filter('rest_post_dispatch', function ($response) {
    if (is_user_logged_in()) $response->header('Cache-Control', 'private, no-store');
    return $response;
});
add_filter('woocommerce_update_cart_validation', function ($valid, $key, $values, $qty) {
    if ($qty == 0) return $valid;
    $error = mvn_cart_error($values['data'], $qty);
    if ($error) { wc_add_notice($error, 'error'); return false; }
    return $valid;
}, 99, 4);
// Only the classic Woo checkout/cart are supported until Store API tier isolation has been integration tested.
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (strpos($request->get_route(), '/wc/store/') === 0) return new WP_Error('mvn_classic_checkout_required', 'Use the store cart and checkout pages.', ['status' => 403]);
    return $result;
}, 99, 3);
// Explicit staging/launch gate; no checkout before provider/tax/shipping review.
add_action('woocommerce_after_checkout_validation', function ($data, $errors) {
    if (get_option('mvn_checkout_enabled', 'no') !== 'yes') $errors->add('mvn_not_ready', 'Online checkout is awaiting configuration. Please contact Max Volume Nutrition.');
    foreach (WC()->cart->get_cart() as $line) if ($line['data']->get_meta('_mvn_review_required')) $errors->add('mvn_product_review', 'A product in your cart is awaiting verification.');
}, 99, 2);
add_action('admin_notices', function () {
    if (current_user_can('manage_woocommerce') && get_option('mvn_checkout_enabled', 'no') !== 'yes') echo '<div class="notice notice-warning"><p>Max Volume checkout is disabled pending provider, tax, inventory and legal verification. See the repository launch checklist.</p></div>';
});
require_once __DIR__ . '/includes/quotes.php';
require_once __DIR__ . '/includes/presentation.php';
require_once __DIR__ . '/includes/reports.php';

add_filter('woocommerce_rest_prepare_product_variation_object', function ($response) {
    $data = $response->get_data();
    $data['meta_data'] = array_values(array_filter($data['meta_data'] ?? [], function ($m) { $key = is_object($m) ? ($m->key ?? '') : ($m['key'] ?? ''); return strpos($key, '_mvn_') !== 0; }));
    $response->set_data($data); return $response;
});
