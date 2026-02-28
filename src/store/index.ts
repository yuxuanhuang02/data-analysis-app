import { create } from 'zustand';
import { createVCTMSlice, VCTMState } from './slices/vctmSlice';
import { createCollaborationSlice, CollaborationState } from './slices/collaborationSlice';

export const useStore = create<VCTMState & CollaborationState>()((...a) => ({
    ...createVCTMSlice(...a),
    ...createCollaborationSlice(...a),
}));
