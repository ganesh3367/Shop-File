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

const trimmed = (min, max, msg) => z.string({ required_error: msg }).trim().min(min, msg).max(max);
export const email = z.string({ required_error: 'Enter a valid email' }).trim().toLowerCase().email('Enter a valid email').max(160);

export const signupSchema = z.object({
  name: trimmed(2, 80, 'Please tell us your name'),
  email,
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const orderSchema = z.object({
  customer: z.object({
    name: trimmed(2, 80, 'Please enter your name'),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{8,19}$/, 'Enter a valid phone number'),
    address: trimmed(5, 200, 'Enter your street address'),
    city: trimmed(1, 80, 'City is required'),
    state: trimmed(1, 80, 'State is required'),
    zip: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'PIN code must be 6 digits'),
    country: trimmed(1, 80, 'Country is required'),
    notes: z.string().trim().max(500).optional().default(''),
  }),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(10),
        color: z.string().min(1).max(40),
        material: z.string().min(1).max(40),
      }),
    )
    .min(1, 'Your bag is empty')
    .max(30),
  method: z.enum(['ground', 'air', 'express']),
  payment: z.enum(['upi', 'card', 'cod']),
});

export const messageSchema = z.object({
  name: trimmed(2, 80, 'Tell us your name'),
  email,
  topic: z.enum(['General', 'Custom order', 'Delivery', 'Returns', 'Partnership']).default('General'),
  message: trimmed(10, 600, 'A little more detail, please (10+ characters)'),
});

export const subscribeSchema = z.object({ email });

export const statusSchema = z.object({
  status: z.enum(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']),
});

export const readSchema = z.object({ read: z.boolean() });
