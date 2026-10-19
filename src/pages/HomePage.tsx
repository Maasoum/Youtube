import { useEffect } from "react";
import { brand } from "@/config/brand";
import { useCourses } from "@/hooks/useCourses";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Hero } from "@/components/home/Hero";
import { FeaturedCourses } from "@/components/home/FeaturedCourses";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { WhyUs } from "@/components/home/WhyUs";
import { Testimonials } from "@/components/home/Testimonials";
import { FaqPreview } from "@/components/home/FaqPreview";
import { FinalCta } from "@/components/home/FinalCta";

export function HomePage() {
  const { courses, loading, error, reload } = useCourses();
  const { faqs, testimonials, loading: contentLoading } = useSiteContent();

  useEffect(() => {
    document.title = `${brand.nameFa} | دوره‌های هوش مصنوعی برای کودکان`;
  }, []);

  return (
    <>
      <Hero />
      <FeaturedCourses
        courses={courses}
        loading={loading}
        error={error}
        onRetry={reload}
      />
      <HowItWorksSection />
      <WhyUs />
      <Testimonials testimonials={testimonials} loading={contentLoading} />
      <FaqPreview faqs={faqs} loading={contentLoading} />
      <FinalCta />
    </>
  );
}
