export type TestimonialEntry = {
  id: string;
  showcaseId: string;
  folder: string;
};

const OWNER_PHOTO = "owner.jpg";

export function testimonialOwnerPhoto(folder: string) {
  return `/testimonials/${folder}/${OWNER_PHOTO}`;
}

export const TESTIMONIAL_ENTRIES: TestimonialEntry[] = [
  { id: "restaurant", showcaseId: "restaurant", folder: "restaurant" },
  { id: "coffee", showcaseId: "coffee", folder: "coffee" },
  { id: "flower", showcaseId: "flower", folder: "flower" },
  {
    id: "living-room",
    showcaseId: "living-room",
    folder: "living-room",
  },
];
