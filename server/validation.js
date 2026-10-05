import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const d = new Date(`${s}T00:00:00Z`); return !isNaN(d) && d.toISOString().slice(0,10)===s;
}, 'Enter a real date').nullable().optional();
export const receiptSchema = z.object({
  title: z.string().trim().min(2).max(120),
  receiptText: z.string().trim().min(20).max(12000),
  merchant: z.string().trim().max(120).default(''),
  category: z.enum(['Appliances','Services','Other']).default('Other'),
  purchaseDate: date,
  warrantyEndDate: date,
  checked: z.literal(true),
  attachment: z.object({ name:z.string().min(1).max(200), type:z.enum(['image/png','image/jpeg','application/pdf']), data:z.string().max(8_388_608) }).strict().optional(),
}).strict();
export const searchSchema = z.object({
  q:z.string().trim().max(300).default(''),
  category:z.enum(['All','Appliances','Services','Other']).default('All'),
  mode:z.enum(['keyword','vector','hybrid']).default('hybrid'),
});
export function validateAttachment(file) {
  if (!file) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) throw new Error('Invalid attachment encoding');
  const data = Buffer.from(file.data,'base64');
  if (data.length === 0 || data.length > 6*1024*1024) throw new Error('Attachment must be between 1 byte and 6 MB');
  const isPng = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJpeg = data[0]===255 && data[1]===216 && data[2]===255;
  const isPdf = data.subarray(0,5).toString()==='%PDF-';
  if (!((file.type==='image/png' && isPng)||(file.type==='image/jpeg' && isJpeg)||(file.type==='application/pdf' && isPdf))) throw new Error('File content does not match JPG, PNG or PDF type');
  return data;
}
