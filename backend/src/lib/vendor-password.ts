import jwt from 'jsonwebtoken';

const vendorSetPasswordSecret =
  process.env.VENDOR_SET_PASSWORD_SECRET || process.env.JWT_SECRET || 'secret';

export interface VendorSetPasswordPayload {
  userId: string;
  email: string;
  vendorId: string;
  type: 'vendor_set_password';
}

export const createVendorSetPasswordToken = (input: {
  userId: string;
  email: string;
  vendorId: string;
}) =>
  jwt.sign(
    {
      userId: input.userId,
      email: input.email,
      vendorId: input.vendorId,
      type: 'vendor_set_password',
    },
    vendorSetPasswordSecret,
    { expiresIn: '2d' }
  );

export const verifyVendorSetPasswordToken = (token: string) =>
  jwt.verify(token, vendorSetPasswordSecret) as VendorSetPasswordPayload;
