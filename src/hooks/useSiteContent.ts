import { useCallback, useEffect, useState } from "react";
import {
  contentApi,
  getErrorMessage,
  type SiteFaq,
  type Testimonial,
} from "@/api";

interface UseSiteContentResult {
  faqs: SiteFaq[];
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSiteContent(): UseSiteContentResult {
  const [faqs, setFaqs] = useState<SiteFaq[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    contentApi
      .getSiteContent()
      .then((content) => {
        if (!active) return;
        setFaqs(content.faqs);
        setTestimonials(content.testimonials);
      })
      .catch((reason: unknown) => {
        if (active) setError(getErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { faqs, testimonials, loading, error, reload };
}
