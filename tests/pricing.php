<?php
// Pure contract tests for tier/pricing rules. WooCommerce integration tests are separate launch gates.
define('ABSPATH', __DIR__);
$GLOBALS['roles'] = [];
function add_action($hook, $callback, ...$args) { $GLOBALS['hooks'][$hook][] = $callback; }
function add_filter($hook, $callback, ...$args) { $GLOBALS['hooks'][$hook][] = $callback; }
function add_shortcode(...$args) {}
function wp_get_current_user() { return (object)['roles' => $GLOBALS['roles']]; }
function wc_get_product($id) { return $GLOBALS['products'][$id]; }
class Product {
    public function __construct(public array $meta = [], public int $parent = 0) {}
    public function get_meta($key) { return $this->meta[$key] ?? ''; }
    public function get_parent_id() { return $this->parent; }
    public function get_name() { return 'Test product'; }
}
require __DIR__ . '/../commerce/max-volume-commerce.php';
$n = 0;
function eq($actual, $expected) { global $n; $n++; if ($actual !== $expected) throw new Exception('Assertion ' . $n . ' failed: ' . var_export($actual, true)); }
$p = new Product(['_mvn_gym_price' => '3900', '_mvn_dealer_price' => '3500', '_mvn_dealer_moq' => '6']);
eq(mvn_tier(), 'retail'); eq(mvn_price('4999', $p), '4999');
$GLOBALS['roles'] = ['customer']; eq(mvn_price('4999', $p), '4999');
$GLOBALS['roles'] = ['mvn_gym']; eq(mvn_price('4999', $p), '3900');
$GLOBALS['roles'] = ['mvn_dealer']; eq(mvn_price('4999', $p), '3500');
eq(mvn_cart_error($p, 5) !== '', true); eq(mvn_cart_error($p, 6), '');
$p->meta['_mvn_allowed_tiers'] = 'dealer';
$GLOBALS['roles'] = []; eq(mvn_allowed($p), false); eq(mvn_price('4999', $p), ''); eq(mvn_cart_error($p, 100) !== '', true);
$GLOBALS['products'][1] = $p;
eq(mvn_allowed(new Product([], 1)), false);
$GLOBALS['roles'] = ['mvn_dealer']; eq(mvn_allowed(new Product([], 1)), true);
$p->meta['_mvn_dealer_price'] = '-1'; eq(mvn_price('4999', $p), '4999');
$p->meta['_mvn_dealer_price'] = '0'; eq(mvn_price('4999', $p), '0');
$GLOBALS['roles'] = []; eq(mvn_tier(), 'retail'); eq(mvn_allowed($p), false);
$query = mvn_catalogue_meta_query([]);
eq($query[0][2]['value'], '(^|,)retail(,|$)');
$GLOBALS['roles'] = ['mvn_dealer'];
eq(mvn_catalogue_meta_query([])[0][2]['value'], '(^|,)dealer(,|$)');
$hash = $GLOBALS['hooks']['woocommerce_get_variation_prices_hash'][0];
eq($hash([])['mvn_tier'], 'dealer');
$GLOBALS['roles'] = [];
eq($hash([])['mvn_tier'], 'retail');
class Response {
    public function __construct(public array $data) {}
    public function get_data() { return $this->data; }
    public function set_data($data) { $this->data = $data; }
}
$strip = $GLOBALS['hooks']['woocommerce_rest_prepare_product_object'][0];
$r = $strip(new Response(['meta_data' => [['key' => '_mvn_purchase_cost', 'value' => 'secret'], ['key' => '_mvn_dealer_price', 'value' => 'secret'], ['key' => 'public', 'value' => 'ok']]]));
eq(count($r->data['meta_data']), 1); eq($r->data['meta_data'][0]['key'], 'public');
function is_user_logged_in() { return false; }
class WP_Error { public function __construct(public $code, public $message, public $data) {} }
class Request { public function __construct(public $route) {} public function get_route() { return $this->route; } }
$deny = $GLOBALS['hooks']['rest_pre_dispatch'][0];
eq($deny(null, null, new Request('/wc/store/v1/products'))->data['status'], 403);
eq($deny(null, null, new Request('/wc/store/v1/checkout'))->data['status'], 403);
eq($deny(null, null, new Request('/unrelated')), null);
function wp_die($message, ...$args) { throw new Exception($message); }
foreach (['admin_post_mvn_apply', 'admin_post_mvn_quote'] as $hook) {
    try { $GLOBALS['hooks'][$hook][0](); eq(true, false); } catch (Exception $e) { eq(strpos($e->getMessage(), 'Sign in required') === 0, true); }
}
echo "$n pricing/access contract assertions passed\n";
