import * as z from "zod";

export const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  pricePerMonth: z.coerce.number().positive().int(),
  securityDeposit: z.coerce.number().positive().int(),
  applicationFee: z.coerce.number().positive().int(),
  isPetsAllowed: z.boolean(),
  isParkingIncluded: z.boolean(),
  photoUrls: z
    .array(z.instanceof(File))
    .min(1, "At least one photo is required"),
  amenities: z.union([
    z.array(z.string()).min(1, "Amenities are required"),
    z.string().min(1, "Amenities are required"),
  ]),
  highlights: z.union([
    z.array(z.string()).min(1, "Highlights are required"),
    z.string().min(1, "Highlights are required"),
  ]),
  beds: z.coerce.number().positive().max(10).int(),
  baths: z.coerce.number().positive().max(10).int(),
  squareFeet: z.coerce.number().int().positive(),
  propertyType: z.string().min(1, "Property type is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

export const editPropertySchema = propertySchema.extend({
  photoUrls: z
    .array(z.union([z.instanceof(File), z.string()]))
    .optional(),
});

export type EditPropertyFormData = z.infer<typeof editPropertySchema>;

export const applicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  startDate: z.string().min(1, "Move-in / Start date is required"),
  message: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
