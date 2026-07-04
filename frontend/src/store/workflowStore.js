import { create } from 'zustand';
import { api } from './authStore';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';

export const useWorkflowStore = create((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,
  isDirty: false,

  fetchWorkflows: async (params = {}) => {
    set({ isLoading: true });
    try {
      const response = await api.get('/workflows', { params });
      set({ workflows: response.data.data.workflows, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch workflows', isLoading: false });
    }
  },

  fetchWorkflow: async (id) => {
    set({ isLoading: true, isDirty: false });
    try {
      const response = await api.get(`/workflows/${id}`);
      const workflow = response.data.data.workflow;
      
      // Load active version nodes/edges or fallback to draft state
      const activeVersion = workflow.versions?.find(v => v.version === workflow.currentVersion);
      const rawNodes = activeVersion ? activeVersion.nodes : (workflow.draftNodes || []);
      const edges = activeVersion ? activeVersion.edges : (workflow.draftEdges || []);

      // Map Mongoose schema nodes to React Flow node format
      const nodes = rawNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        onError: node.onError || { strategy: 'STOP' },
        data: {
          label: node.label || node.id,
          type: node.type,
          config: node.config || {},
        },
      }));

      set({
        currentWorkflow: workflow,
        nodes,
        edges,
        isLoading: false,
      });
    } catch (err) {
      set({ error: 'Failed to load workflow details', isLoading: false });
    }
  },

  createWorkflow: async (name, description, tags = []) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/workflows', { name, description, tags });
      const newWorkflow = response.data.data.workflow;
      set((state) => ({
        workflows: [newWorkflow, ...state.workflows],
        isLoading: false,
      }));
      return newWorkflow;
    } catch (err) {
      set({ error: 'Failed to create workflow', isLoading: false });
      return null;
    }
  },

  // React Flow changes hooks
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge({ ...connection, id: `e-${Date.now()}` }, state.edges),
      isDirty: true,
    }));
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    }));
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config: { ...node.data?.config, ...config } } } : node
      ),
      isDirty: true,
    }));
  },

  updateNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      ),
      isDirty: true,
    }));
  },

  updateNodeOnError: (nodeId, onError) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, onError } : node
      ),
      isDirty: true,
    }));
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      isDirty: true,
    }));
  },

  deleteEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true,
    }));
  },

  saveDraft: async () => {
    const { currentWorkflow, nodes, edges } = get();
    if (!currentWorkflow) return false;

    // Map React Flow nodes to Mongoose schema node format
    const dbNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data?.label || node.id,
      config: node.data?.config || {},
      position: node.position,
      onError: node.onError,
    }));

    set({ isLoading: true });
    try {
      const response = await api.put(`/workflows/${currentWorkflow._id}`, {
        draftNodes: dbNodes,
        draftEdges: edges,
      });
      const updatedWorkflow = response.data.data.workflow;
      const mappedNodes = (updatedWorkflow.draftNodes || []).map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        onError: node.onError || { strategy: 'STOP' },
        data: {
          label: node.label || node.id,
          type: node.type,
          config: node.config || {},
        },
      }));

      set({
        currentWorkflow: updatedWorkflow,
        nodes: mappedNodes,
        isDirty: false,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ error: 'Failed to save workflow draft', isLoading: false });
      return false;
    }
  },

  publishWorkflow: async (changeLog) => {
    const { currentWorkflow, nodes, edges } = get();
    if (!currentWorkflow) return false;

    // Map React Flow nodes to Mongoose schema node format
    const dbNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data?.label || node.id,
      config: node.data?.config || {},
      position: node.position,
      onError: node.onError,
    }));

    set({ isLoading: true });
    try {
      const response = await api.post(`/workflows/${currentWorkflow._id}/publish`, {
        nodes: dbNodes,
        edges,
        changeLog,
      });
      const updatedWorkflow = response.data.data.workflow;
      
      const activeVersion = updatedWorkflow.versions?.find(v => v.version === updatedWorkflow.currentVersion);
      const rawNodes = activeVersion ? activeVersion.nodes : (updatedWorkflow.draftNodes || []);
      const mappedNodes = rawNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        onError: node.onError || { strategy: 'STOP' },
        data: {
          label: node.label || node.id,
          type: node.type,
          config: node.config || {},
        },
      }));

      set({
        currentWorkflow: updatedWorkflow,
        nodes: mappedNodes,
        isDirty: false,
        isLoading: false,
      });
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.errors?.[0]?.message || 'Failed to publish workflow';
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  duplicateWorkflow: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.post(`/workflows/${id}/duplicate`);
      const duplicated = response.data.data.workflow;
      set((state) => ({
        workflows: [duplicated, ...state.workflows],
        isLoading: false,
      }));
      return duplicated;
    } catch (err) {
      set({ error: 'Failed to duplicate workflow', isLoading: false });
      return null;
    }
  },

  deleteWorkflow: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/workflows/${id}`);
      set((state) => ({
        workflows: state.workflows.filter((w) => w._id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to delete workflow', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
