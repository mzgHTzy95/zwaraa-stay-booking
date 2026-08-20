import heroLagoon from "@/assets/hero-lagoon.webp";
import cabinLagune from "@/assets/cabin-lagune.jpg";
import cabinSable from "@/assets/cabin-sable.jpg";
import cabinCorail from "@/assets/cabin-corail.jpg";
import cabinColline from "@/assets/cabin-colline.jpg";
import galleryBoat from "@/assets/gallery-boat.jpg";
import galleryInterior from "@/assets/gallery-interior.jpg";
import galleryHorse from "@/assets/gallery-horse.jpeg"

export { heroLagoon, galleryBoat, galleryInterior, galleryHorse };

const bySlug: Record<string, string> = {
  lagune: cabinLagune,
  sable: cabinSable,
  corail: cabinCorail,
  colline: cabinColline,
};

export function cabinCover(slug: string, photos?: string[] | null) {
  if (photos && photos.length > 0) return photos[0]!;
  return bySlug[slug] ?? cabinLagune;
}

export function cabinGallery(slug: string, photos?: string[] | null) {
  if (photos && photos.length > 0) return photos;
  return [bySlug[slug] ?? cabinLagune, galleryInterior, galleryBoat, heroLagoon, galleryHorse];
}
