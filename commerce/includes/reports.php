<?php
defined('ABSPATH') || exit;
add_action('woocommerce_checkout_create_order', function ($order) { $order->update_meta_data('_mvn_tier', mvn_tier()); });
add_action('woocommerce_checkout_create_order_line_item', function ($item, $key, $values) {
    $cost = $values['data']->get_meta('_mvn_purchase_cost');
    if ($cost !== '' && is_numeric($cost)) $item->add_meta_data('_mvn_unit_cost', wc_format_decimal($cost));
}, 10, 3);
// Private cost snapshots must not be serialized into order-item REST responses.
add_filter('woocommerce_rest_prepare_shop_order_object', function ($response) {
    $data = $response->get_data();
    foreach ($data['line_items'] ?? [] as $i => $line) {
        $data['line_items'][$i]['meta_data'] = array_values(array_filter($line['meta_data'] ?? [], function ($m) { $key = is_object($m) ? ($m->key ?? '') : ($m['key'] ?? ''); return strpos($key, '_mvn_') !== 0; }));
    }
    $response->set_data($data); return $response;
});
add_action('admin_menu', function () {
    add_submenu_page('woocommerce', 'Max Volume reports', 'Max Volume reports', 'manage_woocommerce', 'mvn-reports', 'mvn_reports');
});
function mvn_reports() {
    if (!current_user_can('manage_woocommerce')) wp_die('Not authorized.', '', ['response' => 403]);
    $totals = ['retail' => 0, 'gym' => 0, 'dealer' => 0, 'unclassified' => 0];
    $counts = array_fill_keys(array_keys($totals), 0);
    $gross = 0; $missing_cost_lines = 0; $page = 1;
    do {
        $result = wc_get_orders(['status' => ['processing', 'completed'], 'date_paid' => '>' . (time() - 30 * DAY_IN_SECONDS), 'limit' => 100, 'page' => $page++, 'paginate' => true]);
        foreach ($result->orders as $order) {
            $tier = $order->get_meta('_mvn_tier');
            if (!isset($totals[$tier])) $tier = 'unclassified';
            $totals[$tier] += (float)$order->get_total() - (float)$order->get_total_refunded(); $counts[$tier]++;
            foreach ($order->get_items() as $item) {
                $cost = $item->get_meta('_mvn_unit_cost');
                if ($cost === '') { $missing_cost_lines++; continue; }
                $qty = $item->get_quantity() + $order->get_qty_refunded_for_item($item->get_id());
                $gross += (float)$item->get_total() - (float)$order->get_total_refunded_for_item($item->get_id()) - (float)$cost * $qty;
            }
        }
    } while ($page <= $result->max_num_pages);
    $pending = count(get_users(['meta_key' => '_mvn_application_status', 'meta_value' => 'pending', 'fields' => 'ID']));
    echo '<div class="wrap"><h1>Max Volume — last 30 days paid orders</h1><p>Source: WooCommerce processing/completed orders with a paid date. Revenue includes tax/shipping less refunds; fully refunded orders are excluded. This is an operational estimate, not an accounting statement.</p><table class="widefat"><tr><th>Tier at checkout</th><th>Orders</th><th>Revenue</th></tr>';
    foreach ($totals as $tier => $value) echo '<tr><td>' . esc_html($tier) . '</td><td>' . esc_html($counts[$tier]) . '</td><td>' . wp_kses_post(wc_price($value)) . '</td></tr>';
    echo '</table><p>Gross product margin estimate (excludes tax/shipping/fees; only lines with captured purchase cost): ' . wp_kses_post(wc_price($gross)) . '</p><p>Lines missing purchase-cost snapshots: ' . esc_html($missing_cost_lines) . '</p><p>Pending partner applications: ' . esc_html($pending) . '</p><p>Use WooCommerce Analytics for top sellers and WooCommerce stock reports for low stock. Historical orders without a tier snapshot are unclassified.</p></div>';
}
