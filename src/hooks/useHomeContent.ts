import { useCallback, useEffect, useState } from "react";
import {
  api,
  getErrorMessage,
  type BlogPost,
  type HomeFaq,
  type Teacher,
} from "@/api";

interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useApiList<T>(loader: () => Promise<T[]>): ListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loader()
      .then((data) => {
        if (active) setItems(data);
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
  }, [loader, version]);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { items, loading, error, reload };
}

export function useBlogPosts(): ListState<BlogPost> {
  return useApiList<BlogPost>(api.listPosts);
}

export function useTeachers(): ListState<Teacher> {
  return useApiList<Teacher>(api.listTeachers);
}

export function useHomeFaqs(): ListState<HomeFaq> {
  return useApiList<HomeFaq>(api.listFaqs);
}
