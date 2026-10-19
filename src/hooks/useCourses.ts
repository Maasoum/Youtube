import { useCallback, useEffect, useState } from "react";
import { coursesApi, getErrorMessage, type Course } from "@/api";

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useCourses(): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    coursesApi
      .list()
      .then((data) => {
        if (active) setCourses(data);
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

  return { courses, loading, error, reload };
}
