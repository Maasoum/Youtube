import { useEffect } from "react";
import { brand } from "@/config/brand";
import { Hero } from "@/components/home/Hero";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PopularCourses } from "@/components/home/PopularCourses";
import { MaterialsSection } from "@/components/home/MaterialsSection";
import { TeachersSection } from "@/components/home/TeachersSection";
import { BlogSection } from "@/components/home/BlogSection";
import { HomeFaq } from "@/components/home/HomeFaq";
import { MembershipSection } from "@/components/home/MembershipSection";

export function HomePage() {
  useEffect(() => {
    document.title = `${brand.nameFa} | بهترین جا برای یادگیری هوش مصنوعی و بازی کودکان`;
  }, []);

  return (
    <>
      <Hero />
      <FeaturesSection />
      <PopularCourses />
      <MaterialsSection />
      <TeachersSection />
      <BlogSection />
      <HomeFaq />
      <MembershipSection />
    </>
  );
}
