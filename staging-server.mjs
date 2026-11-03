// Dedicated staging entry point: deployment settings cannot turn integrations on.
process.env.STAGING_MODE='true';
if(!process.env.PUBLIC_ORIGIN&&process.env.RENDER_EXTERNAL_URL)process.env.PUBLIC_ORIGIN=process.env.RENDER_EXTERNAL_URL;
for(const name of ['PAYMENTS_ENABLED','RAZORPAY_TESTED','LIVE_PAYMENTS_APPROVED','POLICIES_APPROVED','SHIPROCKET_ENABLED','SHIPROCKET_TESTED'])process.env[name]='false';
process.env.PAYMENT_MODE='test';
for(const name of ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD','SHIPROCKET_PICKUP'])delete process.env[name];
await import('./server.mjs');
