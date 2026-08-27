import {
  createStaffMember,
  getSettings,
  getStaff,
  updateSettings,
  updateStaffMember,
} from '@/lib/qcStorage';
import { SINGLETON, fromStorage, fromStorageWrite, qcApi } from '@/store/api/qcApi';
import type { QCSettings, StaffMember } from '@/types/qc.types';

const settingsEndpoints = qcApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<QCSettings, void>({
      queryFn: () => fromStorage(() => getSettings()),
      providesTags: [{ type: 'Settings', id: SINGLETON }],
    }),

    updateSettings: build.mutation<null, Partial<QCSettings>>({
      queryFn: (settings) => fromStorageWrite(() => updateSettings(settings)),
      invalidatesTags: [{ type: 'Settings', id: SINGLETON }],
    }),

    getStaff: build.query<StaffMember[], void>({
      queryFn: () => fromStorage(() => getStaff()),
      providesTags: [{ type: 'Staff', id: SINGLETON }],
    }),

    createStaffMember: build.mutation<null, StaffMember>({
      queryFn: (member) => fromStorageWrite(() => createStaffMember(member)),
      invalidatesTags: [{ type: 'Staff', id: SINGLETON }],
    }),

    updateStaffMember: build.mutation<null, { memberId: string; updates: Partial<StaffMember> }>({
      queryFn: ({ memberId, updates }) =>
        fromStorageWrite(() => updateStaffMember(memberId, updates)),
      invalidatesTags: [{ type: 'Staff', id: SINGLETON }],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetStaffQuery,
  useCreateStaffMemberMutation,
  useUpdateStaffMemberMutation,
} = settingsEndpoints;
