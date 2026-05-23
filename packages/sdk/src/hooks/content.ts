// hooks/content.ts → content-svc (per ADR-0029)
import { useRef } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PathwayDTOSchema,
  AssessmentProfileDTOSchema,
  ItemAdminDTOSchema,
  ItemVersionDTOSchema,
  ItemCreateDTOSchema,
  ItemUpdateDTOSchema,
  ItemVersionCreateDTOSchema,
  ItemLifecycleTransitionDTOSchema,
  StimulusAdminDTOSchema,
  StimulusCreateDTOSchema,
  StimulusUpdateDTOSchema,
  type ItemCreateDTO,
  type ItemUpdateDTO,
  type ItemVersionCreateDTO,
  type ItemLifecycleTransitionDTO,
  type StimulusCreateDTO,
  type StimulusUpdateDTO,
} from '@mm/types';
import { useMmClient } from '../context.js';
import { mmKeys } from '../keys.js';

const PathwayListSchema = PathwayDTOSchema.array();

export function usePathways() {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.pathways.list(),
    staleTime: 300_000,
    queryFn: () => client.get('/content-svc/pathways', PathwayListSchema).then((r) => r.data),
  });
}

// PHASE-2: not in v1 OWNERS.md — content-svc serves the list at
// `GET /assessment-profiles` (line 153) but no per-id endpoint exists in v1.
// Prefix retained for future-stage path stability.
export function useAssessmentProfile(profileId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.assessmentProfiles.byId(profileId),
    queryFn: () =>
      client
        .get(`/content-svc/content/profiles/${profileId}`, AssessmentProfileDTOSchema)
        .then((r) => r.data),
    enabled: profileId.length > 0,
  });
}

// ─── Content authoring queries (platform_admin only) ─────────────────────────

export function useItemAdmin(itemId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.items.byId(itemId),
    queryFn: () =>
      client.get(`/content-svc/content/items/${itemId}`, ItemAdminDTOSchema).then((r) => r.data),
    enabled: itemId.length > 0,
  });
}

export function useItemVersions(itemId: string) {
  const client = useMmClient();
  return useQuery({
    queryKey: mmKeys.items.versions(itemId),
    queryFn: () =>
      client
        .get(`/content-svc/content/items/${itemId}/versions`, ItemVersionDTOSchema.array())
        .then((r) => r.data),
    enabled: itemId.length > 0,
  });
}

// ─── Content authoring mutations (platform_admin only) ───────────────────────

export function useCreateItem() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  const idempKey = useRef<string>(crypto.randomUUID());
  return useMutation({
    mutationFn: (body: ItemCreateDTO) => {
      const parsed = ItemCreateDTOSchema.parse(body);
      return client
        .post('/content-svc/content/items', ItemAdminDTOSchema, parsed, idempKey.current)
        .then((r) => r.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.items.all() });
      idempKey.current = crypto.randomUUID();
    },
  });
}

export function useUpdateItem() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemUpdateDTO }) => {
      const parsed = ItemUpdateDTOSchema.parse(body);
      return client
        .patch(
          `/content-svc/content/items/${itemId}`,
          ItemAdminDTOSchema,
          parsed,
          crypto.randomUUID(),
        )
        .then((r) => r.data);
    },
    onSuccess: (_data, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.items.byId(itemId) });
    },
  });
}

export function useCreateItemVersion() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemVersionCreateDTO }) => {
      const parsed = ItemVersionCreateDTOSchema.parse(body);
      return client
        .post(
          `/content-svc/content/items/${itemId}/versions`,
          ItemVersionDTOSchema,
          parsed,
          crypto.randomUUID(),
        )
        .then((r) => r.data);
    },
    onSuccess: (_data, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.items.versions(itemId) });
      void queryClient.invalidateQueries({ queryKey: mmKeys.items.byId(itemId) });
    },
  });
}

const LifecycleResponseSchema = z.object({ id: z.string(), lifecycle: z.string() });

export function useTransitionItemLifecycle() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemLifecycleTransitionDTO }) => {
      const parsed = ItemLifecycleTransitionDTOSchema.parse(body);
      return client
        .patch(
          `/content-svc/content/items/${itemId}/lifecycle`,
          LifecycleResponseSchema,
          parsed,
          crypto.randomUUID(),
        )
        .then((r) => r.data);
    },
    onSuccess: (_data, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.items.byId(itemId) });
    },
  });
}

export function useCreateStimulus() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  const idempKey = useRef<string>(crypto.randomUUID());
  return useMutation({
    mutationFn: (body: StimulusCreateDTO) => {
      const parsed = StimulusCreateDTOSchema.parse(body);
      return client
        .post('/content-svc/content/stimuli', StimulusAdminDTOSchema, parsed, idempKey.current)
        .then((r) => r.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.stimuli.all() });
      idempKey.current = crypto.randomUUID();
    },
  });
}

export function useUpdateStimulus() {
  const client = useMmClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stimulusId, body }: { stimulusId: string; body: StimulusUpdateDTO }) => {
      const parsed = StimulusUpdateDTOSchema.parse(body);
      return client
        .patch(
          `/content-svc/content/stimuli/${stimulusId}`,
          StimulusAdminDTOSchema,
          parsed,
          crypto.randomUUID(),
        )
        .then((r) => r.data);
    },
    onSuccess: (_data, { stimulusId }) => {
      void queryClient.invalidateQueries({ queryKey: mmKeys.stimuli.byId(stimulusId) });
    },
  });
}
