"use client";

import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { useAsync } from "./useAsync";

/** Loads the project in the current /projects/[id] route, with its owner. */
export function useProject() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(() => api.getProject(id), [id]);
  return { projectId: id, ...state };
}
