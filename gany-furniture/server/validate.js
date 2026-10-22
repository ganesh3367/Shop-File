import { z } from 'zod';

/** Express middleware: validate req.body against a zod schema and replace it with the parsed value. */
export const body = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue.message, field: issue.path.join('.') });
  }
  req.body = parsed.data;
  next();
};

const text = (min, max, msg) => z.string({ required_error: msg }).trim().min(min, msg).max(max);
export const email = z.string({ required_error: 'Enter a valid email' }).trim().toLowerCase().email('Enter a valid email').max(160);
const password = z.string().min(6, 'Password must be at least 6 characters').max(128);
const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{8,19}$/, 'Enter a valid phone number');
const zip = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'PIN code must be 6 digits');
const couponCode = z.string().trim().max(30).optional();

// ---- auth ----
export const signupSchema = z.object({ name: text(2, 80, 'Please tell us your name'), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });

// ---- addresses & checkout ----
const addressFields = {
  name: text(2, 80, 'Please enter your name'),
  phone,
  address: text(5, 200, 'Enter your street address'),
  city: text(1, 80, 'City is required'),
  state: text(1, 80, 'State is required'),
  zip,
  country: text(1, 80, 'Country is required'),
};
export const addressSchema = z.object({
  label: z.string().trim().max(30).optional().default('Home'),
  ...addressFields,
  isDefault: z.boolean().optional().default(false),
});

const lineItems = z
  .array(
    z.object({
      id: z.string().min(1).max(80),
      qty: z.number().int().min(1).max(10),
      color: z.string().min(1).max(40),
      material: z.string().min(1).max(40),
    }),
  )
  .min(1, 'Your bag is empty')
  .max(30);

export const orderSchema = z.object({
  customer: z.object({ ...addressFields, email, notes: z.string().trim().max(500).optional().default('') }),
  items: lineItems,
  method: z.enum(['ground', 'air', 'express']),
  payment: z.enum(['upi', 'card', 'cod']),
  coupon: couponCode,
  saveAddress: z.boolean().optional().default(false),
});

export const couponCheckSchema = z.object({ code: z.string().trim().min(1, 'Enter a code').max(30), items: lineItems });

// ---- returns & reviews ----
export const returnSchema = z.object({
  reason: z.enum(['Damaged on arrival', 'Not as described', 'Changed my mind', 'Wrong item delivered', 'Other']),
  details: z.string().trim().max(600).optional().default(''),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a star rating').max(5),
  title: text(3, 80, 'Give your review a short title'),
  body: text(10, 1000, 'Tell us a little more (10+ characters)'),
});

// ---- contact ----
export const messageSchema = z.object({
  name: text(2, 80, 'Tell us your name'),
  email,
  topic: z.enum(['General', 'Custom order', 'Delivery', 'Returns', 'Partnership']).default('General'),
  message: text(10, 600, 'A little more detail, please (10+ characters)'),
});
export const subscribeSchema = z.object({ email });

// ---- admin ----
export const statusSchema = z.object({
  status: z.enum(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']),
  note: z.string().trim().max(200).optional(),
});
export const readSchema = z.object({ read: z.boolean() });

const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ID may only use lowercase letters, numbers and dashes');
const money = (msg) => z.coerce.number({ invalid_type_error: msg }).int(msg).positive(msg).max(10_000_000);

export const productSchema = z.object({
  id: slug.optional(),
  name: text(2, 80, 'Product name is required'),
  category: z.enum(['seating', 'tables', 'lighting']),
  type: text(2, 40, 'Type is required, e.g. Sofas'),
  price: money('Price must be a whole number of rupees'),
  compareAt: money('Compare-at price must be a whole number').nullable().optional(),
  image: text(1, 500, 'Add a product image'),
  badge: z.enum(['New', 'Bestseller', 'Sale']).nullable().optional(),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative').max(100000),
  colors: z
    .array(
      z.object({
        name: text(1, 30, 'Colour name required'),
        hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Use a hex colour like #c9a57a'),
      }),
    )
    .min(1, 'Add at least one colour')
    .max(8),
  materials: z
    .array(text(1, 40, 'Material name required'))
    .min(1, 'Add at least one material')
    .max(8),
  story: text(10, 1000, 'Add a short description'),
  dimensions: text(3, 200, 'Add dimensions'),
  modelUrl: z.string().trim().max(500).nullable().optional(),
  modelCredit: z.string().trim().max(300).nullable().optional(),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});
export const stockSchema = z.object({ stock: z.coerce.number().int().min(0).max(100000) });

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,20}$/, 'Code must be 3–20 letters or numbers'),
  kind: z.enum(['percent', 'fixed']),
  value: z.coerce.number().int().positive('Value must be positive'),
  minSubtotal: z.coerce.number().int().min(0).default(0),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const reviewStatusSchema = z.object({ status: z.enum(['Approved', 'Rejected', 'Pending']) });
export const returnDecisionSchema = z.object({
  status: z.enum(['Approved', 'Rejected', 'Refunded']),
  adminNote: z.string().trim().max(400).optional().default(''),
});
