<?php defined('ABSPATH') || exit; ?><!doctype html>
<html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width,initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class('mvn-commerce'); ?>><?php wp_body_open(); ?>
<?php
$is_home_shell = is_page() && has_shortcode(get_post()->post_content, 'mvn_storefront');
if (!$is_home_shell): ?>
<a class="mvn-skip" href="#mvn-content">Skip to content</a>
<header class="mvn-header"><a class="mvn-brand" href="<?php echo esc_url(home_url('/')); ?>"><span class="mvn-mark">MV</span><span><b>MAX VOLUME</b><small>NUTRITION</small></span></a>
<nav aria-label="Store"><a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>">Shop</a><a href="<?php echo esc_url(home_url('/wholesale/')); ?>">Wholesale</a><a href="<?php echo esc_url(wc_get_page_permalink('myaccount')); ?>">My Account</a><a href="<?php echo esc_url(wc_get_cart_url()); ?>">Cart</a><a href="https://wa.me/917708830513">WhatsApp</a></nav></header>
<?php endif; ?>
<main id="mvn-content" class="<?php echo $is_home_shell ? 'mvn-home' : 'mvn-content'; ?>">
<?php if (is_woocommerce()) { woocommerce_content(); } else { while (have_posts()) { the_post(); if (!$is_home_shell) echo '<h1>' . esc_html(get_the_title()) . '</h1>'; the_content(); } } ?>
</main>
<?php if (!$is_home_shell): ?><footer class="mvn-footer"><b>MAX VOLUME NUTRITION</b><p>Chennai · Tamil Nadu</p><a href="<?php echo esc_url(home_url('/policies/')); ?>">Policies & business information</a> · <a href="https://wa.me/917708830513">+91 77088 30513</a></footer><?php endif; ?>
<?php wp_footer(); ?></body></html>
