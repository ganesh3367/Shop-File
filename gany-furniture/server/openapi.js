// OpenAPI 3 description of the API, served as interactive docs at /api/docs.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const ok = (schema, description = 'OK') => ({ description, ...json(schema) });
const err = (description) => ({ description, ...json(ref('Error')) });
const arrayOf = (name) => ({ type: 'array', items: ref(name) });
const obj = (properties, required) => ({ type: 'object', properties, ...(required && { required }) });
const idParam = (name = 'id', description) => ({ name, in: 'path', required: true, schema: { type: 'string' }, description });

const auth = { security: [{ bearer: [] }] };
const common = { 400: err('Validation error'), 401: err('Not logged in') };
const adminCommon = { ...common, 403: err('Not an admin') };

const op = (tag, summary, { body, params, responses, secure, admin, multipart } = {}) => ({
  tags: [tag],
  summary,
  ...(secure || admin ? auth : {}),
  ...(params && { parameters: params }),
  ...(body && {
    requestBody: multipart ? { required: true, content: { 'multipart/form-data': { schema: body } } } : { required: true, ...json(body) },
  }),
  responses: { ...(admin ? adminCommon : secure ? common : { 400: err('Validation error') }), ...responses },
});

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: "Gany's Furniture API",
    version: '2.0.0',
    description:
      "REST API for the Gany's Furniture store. Authenticate with `POST /api/auth/login`, then click **Authorize** and paste the token. Admin endpoints need an admin account.",
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth' },
    { name: 'Catalogue' },
    { name: 'Checkout' },
    { name: 'Account' },
    { name: 'Contact' },
    { name: 'Admin · Orders' },
    { name: 'Admin · Catalogue' },
    { name: 'Admin · Customers' },
    { name: 'Admin · Marketing' },
    { name: 'Admin · System' },
  ],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: obj({ error: { type: 'string' }, field: { type: 'string' } }, ['error']),
      User: obj({
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['customer', 'admin'] },
      }),
      AuthResult: obj({ token: { type: 'string' }, user: ref('User') }),
      Color: obj({ name: { type: 'string' }, hex: { type: 'string', example: '#c9a57a' } }),
      Product: obj({
        id: { type: 'string', example: 'luxe-loveseat' },
        name: { type: 'string' },
        category: { type: 'string', enum: ['seating', 'tables', 'lighting'] },
        type: { type: 'string', example: 'Sofas' },
        price: { type: 'integer', description: 'Rupees' },
        compareAt: { type: 'integer', nullable: true },
        image: { type: 'string' },
        badge: { type: 'string', nullable: true, enum: ['New', 'Bestseller', 'Sale', null] },
        stock: { type: 'integer' },
        colors: { type: 'array', items: ref('Color') },
        materials: { type: 'array', items: { type: 'string' } },
        story: { type: 'string' },
        dimensions: { type: 'string' },
        modelUrl: { type: 'string', nullable: true, description: '.glb 3D model for the 3D/AR viewer' },
        modelCredit: { type: 'string', nullable: true },
        featured: { type: 'boolean' },
        active: { type: 'boolean' },
        rating: { type: 'number' },
        reviews: { type: 'integer' },
      }),
      ProductInput: obj(
        {
          id: { type: 'string', description: 'Optional slug; generated from the name if omitted' },
          name: { type: 'string' },
          category: { type: 'string', enum: ['seating', 'tables', 'lighting'] },
          type: { type: 'string' },
          price: { type: 'integer' },
          compareAt: { type: 'integer', nullable: true },
          image: { type: 'string' },
          badge: { type: 'string', nullable: true },
          stock: { type: 'integer' },
          colors: { type: 'array', items: ref('Color') },
          materials: { type: 'array', items: { type: 'string' } },
          story: { type: 'string' },
          dimensions: { type: 'string' },
          modelUrl: { type: 'string', nullable: true },
          modelCredit: { type: 'string', nullable: true },
          featured: { type: 'boolean' },
          active: { type: 'boolean' },
        },
        ['name', 'category', 'type', 'price', 'image', 'stock', 'colors', 'materials', 'story', 'dimensions'],
      ),
      LineItem: obj(
        {
          id: { type: 'string' },
          qty: { type: 'integer', minimum: 1, maximum: 10 },
          color: { type: 'string' },
          material: { type: 'string' },
        },
        ['id', 'qty', 'color', 'material'],
      ),
      Address: obj({
        id: { type: 'integer' },
        label: { type: 'string' },
        name: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string', example: '411001' },
        country: { type: 'string' },
        isDefault: { type: 'boolean' },
      }),
      OrderInput: obj(
        {
          customer: obj({
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            country: { type: 'string' },
            notes: { type: 'string' },
          }),
          items: { type: 'array', items: ref('LineItem') },
          method: { type: 'string', enum: ['ground', 'air', 'express'] },
          payment: { type: 'string', enum: ['upi', 'card', 'cod'] },
          coupon: { type: 'string', example: 'WELCOME10' },
          saveAddress: { type: 'boolean' },
        },
        ['customer', 'items', 'method', 'payment'],
      ),
      Order: obj({
        id: { type: 'string', example: 'GNY-408299' },
        date: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] },
        customer: { type: 'object' },
        items: { type: 'array', items: { type: 'object' } },
        history: {
          type: 'array',
          items: obj({ status: { type: 'string' }, note: { type: 'string', nullable: true }, date: { type: 'string' } }),
        },
        return: { ...ref('Return'), nullable: true },
        subtotal: { type: 'integer' },
        discount: { type: 'integer' },
        couponCode: { type: 'string', nullable: true },
        shipping: { type: 'integer' },
        gst: { type: 'integer' },
        total: { type: 'integer' },
        method: { type: 'string' },
        payment: { type: 'string' },
        demo: { type: 'boolean' },
      }),
      Return: obj({
        id: { type: 'integer' },
        orderId: { type: 'string' },
        reason: { type: 'string' },
        details: { type: 'string' },
        status: { type: 'string', enum: ['Requested', 'Approved', 'Rejected', 'Refunded'] },
        refundAmount: { type: 'integer', nullable: true },
        adminNote: { type: 'string' },
      }),
      Review: obj({
        id: { type: 'integer' },
        productId: { type: 'string' },
        name: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        title: { type: 'string' },
        body: { type: 'string' },
        photo: { type: 'string', nullable: true },
        verified: { type: 'boolean', description: 'Reviewer bought this product' },
        status: { type: 'string', enum: ['Pending', 'Approved', 'Rejected'] },
      }),
      Coupon: obj({
        code: { type: 'string', example: 'DIWALI15' },
        kind: { type: 'string', enum: ['percent', 'fixed'] },
        value: { type: 'integer' },
        minSubtotal: { type: 'integer' },
        maxUses: { type: 'integer', nullable: true },
        used: { type: 'integer' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        active: { type: 'boolean' },
      }),
    },
  },
  paths: {
    // ---------------- Auth
    '/auth/signup': {
      post: op('Auth', 'Create a customer account', {
        body: obj({ name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 } }, [
          'name',
          'email',
          'password',
        ]),
        responses: { 201: ok(ref('AuthResult'), 'Created'), 409: err('Email already registered') },
      }),
    },
    '/auth/login': {
      post: op('Auth', 'Log in (customers and admins)', {
        body: obj({ email: { type: 'string' }, password: { type: 'string' } }, ['email', 'password']),
        responses: { 200: ok(ref('AuthResult')), 401: err('Wrong email or password') },
      }),
    },
    '/auth/me': { get: op('Auth', 'Current user', { secure: true, responses: { 200: ok(obj({ user: ref('User') })) } }) },
    '/auth/forgot': {
      post: op('Auth', 'Request a password reset link', {
        body: obj({ email: { type: 'string' } }, ['email']),
        responses: {
          200: ok(
            obj({ ok: { type: 'boolean' }, message: { type: 'string' }, devResetUrl: { type: 'string', description: 'Development only' } }),
          ),
        },
      }),
    },
    '/auth/reset': {
      post: op('Auth', 'Set a new password with a reset token', {
        body: obj({ token: { type: 'string' }, password: { type: 'string' } }, ['token', 'password']),
        responses: { 200: ok(ref('AuthResult')) },
      }),
    },

    // ---------------- Catalogue
    '/products': { get: op('Catalogue', 'List products in the shop', { responses: { 200: ok(obj({ products: arrayOf('Product') })) } }) },
    '/products/{id}': {
      get: op('Catalogue', 'Product with approved reviews and "frequently bought together"', {
        params: [idParam()],
        responses: {
          200: ok(obj({ product: ref('Product'), reviews: arrayOf('Review'), together: { type: 'array', items: { type: 'string' } } })),
          404: err('Not found'),
        },
      }),
    },
    '/products/{id}/reviews': {
      post: op('Catalogue', 'Write a review (optional photo; shown after admin approval)', {
        secure: true,
        multipart: true,
        params: [idParam()],
        body: obj(
          {
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            title: { type: 'string' },
            body: { type: 'string' },
            photo: { type: 'string', format: 'binary' },
          },
          ['rating', 'title', 'body'],
        ),
        responses: { 201: ok(obj({ review: ref('Review') }), 'Created'), 409: err('Already reviewed') },
      }),
    },

    // ---------------- Checkout
    '/coupons/check': {
      post: op('Checkout', 'Check a discount code against a bag', {
        body: obj({ code: { type: 'string' }, items: { type: 'array', items: ref('LineItem') } }, ['code', 'items']),
        responses: { 200: ok(obj({ code: { type: 'string' }, discount: { type: 'integer' }, label: { type: 'string' } })) },
      }),
    },
    '/orders': {
      post: op('Checkout', 'Place an order (priced on the server; reserves stock)', {
        body: ref('OrderInput'),
        responses: { 201: ok(obj({ order: ref('Order') }), 'Created'), 409: err('Out of stock') },
      }),
    },
    '/orders/mine': {
      get: op('Account', "Logged-in customer's orders", { secure: true, responses: { 200: ok(obj({ orders: arrayOf('Order') })) } }),
    },
    '/orders/{id}': {
      get: op('Account', 'One of my orders', {
        secure: true,
        params: [idParam()],
        responses: { 200: ok(obj({ order: ref('Order') })), 404: err('Not found') },
      }),
    },

    // ---------------- Account
    '/account/addresses': {
      get: op('Account', 'Saved addresses', { secure: true, responses: { 200: ok(obj({ addresses: arrayOf('Address') })) } }),
      post: op('Account', 'Add an address', {
        secure: true,
        body: ref('Address'),
        responses: { 201: ok(obj({ addresses: arrayOf('Address') })) },
      }),
    },
    '/account/addresses/{id}': {
      put: op('Account', 'Update an address', {
        secure: true,
        params: [idParam()],
        body: ref('Address'),
        responses: { 200: ok(obj({ addresses: arrayOf('Address') })) },
      }),
      delete: op('Account', 'Delete an address', {
        secure: true,
        params: [idParam()],
        responses: { 200: ok(obj({ addresses: arrayOf('Address') })) },
      }),
    },
    '/account/wishlist': {
      get: op('Account', 'Wishlist product IDs', {
        secure: true,
        responses: { 200: ok(obj({ ids: { type: 'array', items: { type: 'string' } } })) },
      }),
    },
    '/account/wishlist/sync': {
      post: op('Account', 'Merge a browser wishlist into the account', {
        secure: true,
        body: obj({ ids: { type: 'array', items: { type: 'string' } } }),
        responses: { 200: ok(obj({ ids: { type: 'array', items: { type: 'string' } } })) },
      }),
    },
    '/account/wishlist/{productId}': {
      put: op('Account', 'Add to wishlist', {
        secure: true,
        params: [idParam('productId')],
        responses: { 200: ok(obj({ ids: { type: 'array', items: { type: 'string' } } })) },
      }),
      delete: op('Account', 'Remove from wishlist', {
        secure: true,
        params: [idParam('productId')],
        responses: { 200: ok(obj({ ids: { type: 'array', items: { type: 'string' } } })) },
      }),
    },
    '/account/orders/{id}/return': {
      post: op('Account', 'Request a return (delivered orders, within 30 days)', {
        secure: true,
        params: [idParam()],
        body: obj(
          {
            reason: {
              type: 'string',
              enum: ['Damaged on arrival', 'Not as described', 'Changed my mind', 'Wrong item delivered', 'Other'],
            },
            details: { type: 'string' },
          },
          ['reason'],
        ),
        responses: { 201: ok(obj({ return: ref('Return') }), 'Created'), 409: err('Already requested') },
      }),
    },

    // ---------------- Contact
    '/messages': {
      post: op('Contact', 'Send a contact message', {
        body: obj({ name: { type: 'string' }, email: { type: 'string' }, topic: { type: 'string' }, message: { type: 'string' } }, [
          'name',
          'email',
          'message',
        ]),
        responses: { 201: ok(obj({ ok: { type: 'boolean' } }), 'Created') },
      }),
    },
    '/subscribers': {
      post: op('Contact', 'Subscribe to the newsletter', {
        body: obj({ email: { type: 'string' } }, ['email']),
        responses: { 201: ok(obj({ ok: { type: 'boolean' } }), 'Created') },
      }),
    },

    // ---------------- Admin
    '/admin/events': {
      get: op('Admin · System', 'Live event stream (text/event-stream): order, return, review, message', {
        admin: true,
        responses: { 200: { description: 'Server-Sent Events stream' } },
      }),
    },
    '/admin/orders': {
      get: op('Admin · Orders', 'All orders', { admin: true, responses: { 200: ok(obj({ orders: arrayOf('Order') })) } }),
    },
    '/admin/orders/{id}': {
      get: op('Admin · Orders', 'One order', { admin: true, params: [idParam()], responses: { 200: ok(obj({ order: ref('Order') })) } }),
    },
    '/admin/orders/{id}/status': {
      patch: op('Admin · Orders', 'Change status (cancelling restocks)', {
        admin: true,
        params: [idParam()],
        body: obj(
          { status: { type: 'string', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] }, note: { type: 'string' } },
          ['status'],
        ),
        responses: { 200: ok(obj({ order: ref('Order') })), 409: err('Not enough stock to reopen') },
      }),
    },
    '/admin/sample': {
      post: op('Admin · Orders', 'Load sample orders', { admin: true, responses: { 200: ok(obj({ orders: arrayOf('Order') })) } }),
      delete: op('Admin · Orders', 'Remove sample orders', { admin: true, responses: { 200: ok(obj({ orders: arrayOf('Order') })) } }),
    },
    '/admin/returns': {
      get: op('Admin · Orders', 'All return requests', { admin: true, responses: { 200: ok(obj({ returns: arrayOf('Return') })) } }),
    },
    '/admin/returns/{id}': {
      patch: op('Admin · Orders', 'Approve, reject or refund a return (refunds restock)', {
        admin: true,
        params: [idParam()],
        body: obj({ status: { type: 'string', enum: ['Approved', 'Rejected', 'Refunded'] }, adminNote: { type: 'string' } }, ['status']),
        responses: { 200: ok(obj({ returns: arrayOf('Return'), order: ref('Order') })) },
      }),
    },
    '/admin/products': {
      get: op('Admin · Catalogue', 'All products incl. hidden', {
        admin: true,
        responses: { 200: ok(obj({ products: arrayOf('Product'), lowStock: { type: 'integer' } })) },
      }),
      post: op('Admin · Catalogue', 'Create a product', {
        admin: true,
        body: ref('ProductInput'),
        responses: { 201: ok(obj({ product: ref('Product') }), 'Created') },
      }),
    },
    '/admin/products/{id}': {
      put: op('Admin · Catalogue', 'Update a product', {
        admin: true,
        params: [idParam()],
        body: ref('ProductInput'),
        responses: { 200: ok(obj({ product: ref('Product') })) },
      }),
      delete: op('Admin · Catalogue', 'Delete (or hide, if it has orders)', {
        admin: true,
        params: [idParam()],
        responses: { 200: ok(obj({ deleted: { type: 'boolean' }, hidden: { type: 'boolean' } })) },
      }),
    },
    '/admin/products/{id}/stock': {
      patch: op('Admin · Catalogue', 'Set stock level', {
        admin: true,
        params: [idParam()],
        body: obj({ stock: { type: 'integer' } }, ['stock']),
        responses: { 200: ok(obj({ product: ref('Product') })) },
      }),
    },
    '/admin/uploads/image': {
      post: op('Admin · Catalogue', 'Upload a product image (JPG/PNG/WebP, 4 MB)', {
        admin: true,
        multipart: true,
        body: obj({ file: { type: 'string', format: 'binary' } }, ['file']),
        responses: { 201: ok(obj({ url: { type: 'string' } }), 'Uploaded') },
      }),
    },
    '/admin/uploads/model': {
      post: op('Admin · Catalogue', 'Upload a 3D model (.glb, 25 MB)', {
        admin: true,
        multipart: true,
        body: obj({ file: { type: 'string', format: 'binary' } }, ['file']),
        responses: { 201: ok(obj({ url: { type: 'string' } }), 'Uploaded') },
      }),
    },
    '/admin/reviews': {
      get: op('Admin · Catalogue', 'All reviews', { admin: true, responses: { 200: ok(obj({ reviews: arrayOf('Review') })) } }),
    },
    '/admin/reviews/{id}': {
      patch: op('Admin · Catalogue', 'Approve or reject a review', {
        admin: true,
        params: [idParam()],
        body: obj({ status: { type: 'string', enum: ['Approved', 'Rejected', 'Pending'] } }, ['status']),
        responses: { 200: ok(obj({ reviews: arrayOf('Review') })) },
      }),
      delete: op('Admin · Catalogue', 'Delete a review', {
        admin: true,
        params: [idParam()],
        responses: { 200: ok(obj({ reviews: arrayOf('Review') })) },
      }),
    },
    '/admin/coupons': {
      get: op('Admin · Marketing', 'Discount codes with usage', {
        admin: true,
        responses: { 200: ok(obj({ coupons: arrayOf('Coupon') })) },
      }),
      post: op('Admin · Marketing', 'Create a code', {
        admin: true,
        body: ref('Coupon'),
        responses: { 201: ok(obj({ coupons: arrayOf('Coupon') }), 'Created') },
      }),
    },
    '/admin/coupons/{code}': {
      put: op('Admin · Marketing', 'Update a code', {
        admin: true,
        params: [idParam('code')],
        body: ref('Coupon'),
        responses: { 200: ok(obj({ coupons: arrayOf('Coupon') })) },
      }),
      delete: op('Admin · Marketing', 'Delete a code', {
        admin: true,
        params: [idParam('code')],
        responses: { 200: ok(obj({ coupons: arrayOf('Coupon') })) },
      }),
    },
    '/admin/subscribers': {
      get: op('Admin · Marketing', 'Newsletter subscribers', {
        admin: true,
        responses: { 200: ok(obj({ subscribers: { type: 'array', items: { type: 'object' } } })) },
      }),
    },
    '/admin/customers/{email}': {
      get: op('Admin · Customers', 'Customer profile: orders, addresses, reviews, wishlist', {
        admin: true,
        params: [idParam('email')],
        responses: { 200: ok({ type: 'object' }), 404: err('Not found') },
      }),
    },
    '/admin/customers/{email}/reset-link': {
      post: op('Admin · Customers', 'Create a password reset link for a customer', {
        admin: true,
        params: [idParam('email')],
        responses: { 201: ok(obj({ url: { type: 'string' }, expiresAt: { type: 'string' } }), 'Created') },
      }),
    },
    '/admin/users': {
      get: op('Admin · Customers', 'Registered accounts with order totals', {
        admin: true,
        responses: { 200: ok(obj({ users: { type: 'array', items: { type: 'object' } } })) },
      }),
    },
    '/admin/messages': {
      get: op('Admin · Customers', 'Contact inbox', {
        admin: true,
        responses: { 200: ok(obj({ messages: { type: 'array', items: { type: 'object' } } })) },
      }),
    },
    '/admin/messages/{id}': {
      patch: op('Admin · Customers', 'Mark read / unread', {
        admin: true,
        params: [idParam()],
        body: obj({ read: { type: 'boolean' } }, ['read']),
        responses: { 200: ok(obj({ ok: { type: 'boolean' } })) },
      }),
      delete: op('Admin · Customers', 'Delete a message', {
        admin: true,
        params: [idParam()],
        responses: { 200: ok(obj({ ok: { type: 'boolean' } })) },
      }),
    },
    '/admin/activity': {
      get: op('Admin · System', 'Admin activity log (latest 500)', {
        admin: true,
        responses: { 200: ok(obj({ activity: { type: 'array', items: { type: 'object' } } })) },
      }),
    },
  },
};
