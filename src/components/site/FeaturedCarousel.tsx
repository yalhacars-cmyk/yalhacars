import { CarCard } from "@/components/CarCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Car } from "@/data/cars";
import { useLocale } from "@/lib/i18n/context";

export function FeaturedCarousel({ cars }: { cars: Car[] }) {
  const { locale } = useLocale();

  return (
    <Carousel
      opts={{
        align: "start",
        loop: cars.length > 3,
        direction: locale === "ar" ? "rtl" : "ltr",
      }}
      className="relative"
    >
      <CarouselContent>
        {cars.map((car) => (
          <CarouselItem key={car.id} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <CarCard car={car} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="start-2 hidden sm:flex" />
      <CarouselNext className="end-2 hidden sm:flex" />
    </Carousel>
  );
}
