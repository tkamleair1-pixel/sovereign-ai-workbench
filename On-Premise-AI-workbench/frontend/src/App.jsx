import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight, Plus, FileText, Search, Edit3,
  Calculator, CheckCircle2, ShieldCheck, Loader2, AlertCircle,
  Check, Circle, ArrowLeft, Shield, CheckCheck, FileDown, ExternalLink,
  Code, Cpu, Terminal, Sliders, Play, Layers, Eye, RefreshCw, Upload
} from 'lucide-react';
import { workbenchApi } from './api';

export default function App() {
  // Screen Router (22 screens):
  // 1: 'login'          | 2: 'command_center' | 3: 'new_task'     | 4: 'understanding'
  // 5: 'plan'           | 6: 'execution'      | 7: 'activity'     | 8: 'routing'
  // 9: 'document'       | 10: 'knowledge'     | 11: 'files'       | 12: 'projects'
  // 13: 'approvals'     | 14: 'deliverables'  | 15: 'provenance'  | 16: 'security'
  // 17: 'risk_engine'   | 18: 'code_sandbox'  | 19: 'capabilities'| 20: 'model_registry'
  // 21: 'operations'    | 22: 'calculation_workspace'
  const [screen, setScreen] = useState('login');

  // Auth / Role State
  const [role, setRole] = useState('ENGINEER');
  const [organization, setOrganization] = useState('Engineering Workspace');
  const [authLabel, setAuthLabel] = useState('Authorized user');

  // Task & Project State
  const [taskPrompt, setTaskPrompt] = useState(
    'Review the scanned inspection report for Unit-4 and prepare an approval note based on the latest maintenance SOP.'
  );
  const [attachedFileName, setAttachedFileName] = useState('inspection_report.pdf');
  const [docContext, setDocContext] = useState(
    'Equipment: Compressor C-204. Finding: Surface corrosion on flange assembly. Severity: Medium. Vibration nominal.'
  );
  const [projectTitle, setProjectTitle] = useState('Refinery Unit 4');
  const [classification, setClassification] = useState('INTERNAL');
  const globalFileInputRef = useRef(null);
  const fileInputRef = globalFileInputRef;
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentProcessed, setDocumentProcessed] = useState({
    filename: 'inspection_report.pdf',
    bytes: 112,
    sha256: '5b75888c5d9869c69af0de27ac407ff701fce92c482e46b16a1f1b626aca0fe3',
    status: 'PROCESSED',
    text_preview: 'Equipment: Compressor C-204. Finding: Surface corrosion on flange assembly. Severity: Medium. Vibration nominal.',
  });

  const handleAnalyzeDocument = async (fileToAnalyze = selectedFile) => {
    if (!fileToAnalyze) {
      setAnalyzeError('No document attached. Please select or attach a file first.');
      return;
    }

    setIsAnalyzing(true);
    setIsUploading(true);
    setAnalyzeError(null);

    try {
      const response = await workbenchApi.uploadDocument(role, fileToAnalyze);
      const fname = response.data?.filename || fileToAnalyze.name;
      setAttachedFileName(fname);
      const parsedText =
        response.data?.extracted_text ||
        response.data?.text ||
        response.data?.text_preview ||
        response.data?.content ||
        '';

      if (parsedText) {
        setDocContext(parsedText);
      }
      setDocumentProcessed({
        filename: fname,
        bytes: response.data?.bytes || fileToAnalyze.size,
        sha256: response.data?.sha256 || null,
        status: response.data?.status || 'PROCESSED',
        text_preview: response.data?.text_preview || (parsedText ? parsedText.substring(0, 300) : ''),
      });
      return response.data;
    } catch (error) {
      console.error('Upload/analysis failed:', error);
      const rawDetail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to process document';
      const formattedError = typeof rawDetail === 'string' ? rawDetail : JSON.stringify(rawDetail);
      setAnalyzeError(formattedError);
      setDocumentProcessed((prev) => ({
        ...prev,
        status: 'FAILED',
      }));
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setAttachedFiles([file]);
    setAttachedFileName(file.name);
    setAnalyzeError(null);

    // Automatically analyze the uploaded document
    await handleAnalyzeDocument(file);
  };

  const triggerFileUpload = () => {
    if (globalFileInputRef.current) {
      globalFileInputRef.current.value = '';
      globalFileInputRef.current.click();
    }
  };
  // Approval Flow State (WEB 13)
  const [approvalDecision, setApprovalDecision] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);

  // RAG Search State (WEB 10)
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState(null);
  const [ragStats, setRagStats] = useState(null);
  const [ragStatsLoading, setRagStatsLoading] = useState(false);
  const [ragStatsError, setRagStatsError] = useState(null);

  // Files Filter State (WEB 11)
  const [fileFilter, setFileFilter] = useState('All');

  // Operations Filter State (WEB 21)
  const [operationFilter, setOperationFilter] = useState('Processing');

  // Task Mode State
  const [taskMode, setTaskMode] = useState('general');

  // Code Workspace Sandbox State (WEB 18)
  const [codePrompt, setCodePrompt] = useState('Write a Python function with unit tests for...');
  const [codeOutput, setCodeOutput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);
  const [routedModel, setRoutedModel] = useState(null);

  // Calculation Workspace State (WEB 22)
  const [calcPrompt, setCalcPrompt] = useState(
    'Calculate the pressure drop across a 500ft schedule 40 pipe for water at 60°F flowing at 150 gpm.'
  );
  const [calcParams, setCalcParams] = useState('');
  const [calcOutput, setCalcOutput] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [calcRoutedModel, setCalcRoutedModel] = useState('qwen3:4b');
  const [calcTier, setCalcTier] = useState('general-reasoning');

  // Model Registry & Fabric State (Live from /api/v1/models/status)
  const [modelRegistryData, setModelRegistryData] = useState(null);
  const [modelRegistryLoading, setModelRegistryLoading] = useState(false);
  const [modelRegistryError, setModelRegistryError] = useState(null);

  const fetchModelStatus = async () => {
    setModelRegistryLoading(true);
    setModelRegistryError(null);
    try {
      const res = await workbenchApi.getModelStatus(role);
      setModelRegistryData(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to query model registry';
      setModelRegistryError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setModelRegistryLoading(false);
    }
  };

  const fetchRAGStats = async () => {
    setRagStatsLoading(true);
    setRagStatsError(null);
    try {
      const res = await workbenchApi.getRAGStats(role);
      setRagStats(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to query vector store statistics';
      setRagStatsError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setRagStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchModelStatus();
    fetchRAGStats();
  }, [role]);

  // Execution & Agent Pipeline State
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [taskStatus, setTaskStatus] = useState('IDLE');
  const [agentResult, setAgentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Backend Agent Runtime Stages (11 stages)
  const RUNTIME_STAGES = [
    { key: 'UNDERSTAND', label: 'Understand' },
    { key: 'CLASSIFY', label: 'Classify' },
    { key: 'PLAN', label: 'Plan' },
    { key: 'RETRIEVE', label: 'Retrieve' },
    { key: 'REASON', label: 'Reason' },
    { key: 'ACT', label: 'Act' },
    { key: 'OBSERVE', label: 'Observe' },
    { key: 'VERIFY', label: 'Verify' },
    { key: 'RISK', label: 'Risk' },
    { key: 'HUMAN_GATE', label: 'Human Gate' },
    { key: 'DELIVER', label: 'Deliver' },
  ];
  const workflowSteps = RUNTIME_STAGES;

  // Plan 10 Steps (WEB 5)
  const planSteps = [
    'Inspect uploaded document',
    'Extract information',
    'Retrieve relevant SOP',
    'Analyze findings',
    'Draft recommendation',
    'Validate against SOP',
    'Assess risk',
    'Request approval if required',
    'Generate deliverable',
    'Record provenance',
  ];


  // Projects (WEB 12)
  const projectsData = [
    { name: 'Refinery Unit 4 Inspection', status: 'Active Workspace', context: 'Refinery Unit 4' },
    { name: 'Maintenance Review', status: 'Configured Workspace', context: 'Maintenance' },
    { name: 'Engineering Analysis', status: 'Configured Workspace', context: 'Engineering' },
    { name: 'Vendor Evaluation', status: 'Configured Workspace', context: 'Procurement' },
  ];




  // Risk Engine Tiers (WEB 17)
  const riskTiers = [
    { label: 'LOW', description: 'Auto-complete' },
    { label: 'MEDIUM', description: 'Execute + Review' },
    { label: 'HIGH', description: 'Human approval' },
    { label: 'CRITICAL', description: 'Human approval mandatory' },
  ];

  // Live Agent Dispatch
  const handleTriggerAgentExecution = async () => {
    setScreen('execution');
    setTaskStatus('PROCESSING');
    setActiveStepIndex(0);
    setErrorMessage(null);
    setAgentResult(null);

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < 10) return prev + 1;
        clearInterval(interval);
        return 10;
      });
    }, 1500);

    try {
      const response = await workbenchApi.runAgent(
        role,
        taskPrompt,
        docContext,
        attachedFileName
      );
      setAgentResult(response.data);
      setTaskStatus(response.data?.status ? response.data.status.toUpperCase() : 'COMPLETED');
      setActiveStepIndex(11);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Execution failed';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setTaskStatus('ERROR');
    } finally {
      clearInterval(interval);
    }
  };

  const handleExecuteRAGSearch = async (e) => {
    if ((e.type === 'click' || e.key === 'Enter') && knowledgeSearchQuery.trim()) {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      try {
        const res = await workbenchApi.queryRAG(role, knowledgeSearchQuery.trim(), 5);
        setKnowledgeResults(res.data?.results || []);
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          'RAG retrieval failed';
        setKnowledgeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        setKnowledgeResults([]);
      } finally {
        setKnowledgeLoading(false);
      }
    }
  };

  const handleApproveTask = async () => {
    if (!agentResult?.task_id) return;
    setApprovalLoading(true);
    setApprovalError(null);
    setApprovalSuccessMessage(null);
    try {
      const res = await workbenchApi.approveAgentTask(
        role,
        agentResult.task_id,
        approvalComment || 'Approved by authorized human reviewer.'
      );
      setApprovalDecision('APPROVED');
      setApprovalSuccessMessage(res.data?.message || 'Task approved and controlled deliverable generated successfully.');
      setAgentResult((prev) => ({
        ...prev,
        human_gate: res.data?.human_gate || prev?.human_gate,
        delivery: res.data?.delivery || prev?.delivery,
        deliverable: res.data?.deliverable || prev?.deliverable,
        audit_record: prev?.audit_record ? {
          ...prev.audit_record,
          human_approval: true,
          output_docx_sha256: res.data?.deliverable?.sha256 || prev.audit_record.output_docx_sha256,
          delivery_status: 'DELIVERED',
          human_gate: res.data?.human_gate || prev.audit_record.human_gate,
        } : prev?.audit_record,
      }));
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Approval failed';
      setApprovalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectTask = async () => {
    if (!agentResult?.task_id) return;
    setApprovalLoading(true);
    setApprovalError(null);
    setApprovalSuccessMessage(null);
    try {
      const res = await workbenchApi.rejectAgentTask(
        role,
        agentResult.task_id,
        approvalComment || 'Rejected by human reviewer.'
      );
      setApprovalDecision('REJECTED');
      setApprovalSuccessMessage(res.data?.message || 'Task rejected. Controlled deliverable generation is blocked.');
      setAgentResult((prev) => ({
        ...prev,
        human_gate: res.data?.human_gate || prev?.human_gate,
        delivery: res.data?.delivery || prev?.delivery,
        deliverable: null,
        audit_record: prev?.audit_record ? {
          ...prev.audit_record,
          human_approval: false,
          output_docx_sha256: null,
          delivery_status: 'REJECTED',
          human_gate: res.data?.human_gate || prev.audit_record.human_gate,
        } : prev?.audit_record,
      }));
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Rejection failed';
      setApprovalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleEditTask = async () => {
    if (!agentResult?.task_id) return;
    setApprovalLoading(true);
    setApprovalError(null);
    setApprovalSuccessMessage(null);
    try {
      const res = await workbenchApi.editAgentTask(
        role,
        agentResult.task_id,
        approvalComment || 'Revisions requested for operational parameters.'
      );
      setApprovalDecision('EDIT_REQUIRED');
      setApprovalSuccessMessage(res.data?.message || 'Task marked EDIT_REQUIRED. Deliverable generation is held pending revision.');
      setAgentResult((prev) => ({
        ...prev,
        human_gate: res.data?.human_gate || prev?.human_gate,
        delivery: res.data?.delivery || prev?.delivery,
        deliverable: null,
        audit_record: prev?.audit_record ? {
          ...prev.audit_record,
          human_approval: false,
          output_docx_sha256: null,
          delivery_status: 'EDIT_REQUIRED',
          human_gate: res.data?.human_gate || prev.audit_record.human_gate,
        } : prev?.audit_record,
      }));
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Edit request failed';
      setApprovalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = await workbenchApi.generateInference(role, 'coding', codePrompt, classification);
      setCodeOutput(res.data?.output || '');
      setRoutedModel(res.data?.routing?.selected_model || 'qwen2.5-coder:3b');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Code generation failed';
      setCodeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRunCalculation = async () => {
    setCalcLoading(true);
    setCalcError(null);
    try {
      const promptToSend = calcParams.trim()
        ? `${calcPrompt}\n\nParameters: ${calcParams.trim()}`
        : calcPrompt;
      const res = await workbenchApi.generateInference(role, 'reasoning', promptToSend, classification);
      setCalcOutput(res.data?.output || '');
      setCalcRoutedModel(res.data?.routing?.selected_model || 'qwen3:4b');
      setCalcTier(res.data?.routing?.tier || 'general-reasoning');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Calculation failed';
      setCalcError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eafaf1] via-[#f0fbf5] to-[#d8f3e5] text-slate-800 flex items-center justify-center p-6 font-sans antialiased selection:bg-emerald-200">
      <input
        type="file"
        ref={globalFileInputRef}
        onChange={handleDocumentSelect}
        accept=".pdf,.docx,.txt,.csv"
        style={{ display: 'none' }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. WEB 1 — SECURE ACCESS                                       */}
      {/* ------------------------------------------------------------- */}
      {screen === 'login' && (
        <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-6">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">ACCESS</span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Secure workspace</h1>
            <p className="text-slate-600 text-sm mt-1">Enter the organization workspace</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-10 shadow-xl shadow-emerald-950/5 border border-emerald-100/60 flex flex-col gap-6">
            <h2 className="text-2xl font-black tracking-wide text-emerald-800">SOVEREIGN</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-2">Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-2">Authentication</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['ENGINEER', 'REVIEWER', 'AUDITOR', 'ADMIN'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${role === r
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={`${authLabel} (${role})`}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-mono text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => setScreen('command_center')}
              className="mt-2 w-full py-4 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 active:scale-[0.99] shadow-lg shadow-emerald-800/20 transition-all flex items-center justify-center gap-2"
            >
              Enter secure workspace
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. COMMAND CENTER                                             */}
      {/* ------------------------------------------------------------- */}
      {screen === 'command_center' && (
        <div className="w-full max-w-4xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">WORKSPACE</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">What do you need to get done?</h1>
              <p className="text-slate-600 text-sm mt-1">Private organizational work, from one controlled workspace.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreen('security')}
                className="py-2.5 px-4 rounded-2xl font-semibold text-emerald-800 bg-white border border-emerald-200 text-xs shadow-sm hover:bg-emerald-50 transition flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" /> Security
              </button>
              <button
                onClick={() => setScreen('operations')}
                className="py-2.5 px-4 rounded-2xl font-semibold text-emerald-800 bg-white border border-emerald-200 text-xs shadow-sm hover:bg-emerald-50 transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" /> Operations
              </button>
              <button
                onClick={() => setScreen('new_task')}
                className="py-2.5 px-5 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Task
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">
              DESCRIBE THE WORK YOU NEED DONE
            </span>

            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-emerald-950/5 border border-emerald-100/60 space-y-4">
              <textarea
                rows={3}
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                className="w-full p-2 bg-transparent text-slate-800 text-sm placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
              />

              <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs text-emerald-800 font-medium flex-wrap">
                <button type="button" onClick={triggerFileUpload} className="hover:underline">
                  {isAnalyzing || isUploading ? 'Uploading...' : (selectedFile ? `Attached: ${selectedFile.name}` : 'Attach files')}
                </button>
                <span className="text-slate-300">•</span>
                <button onClick={() => setScreen('knowledge')} className="hover:underline">Add context</button>
                <span className="text-slate-300">•</span>
                <button onClick={() => setScreen('projects')} className="hover:underline">Project: {projectTitle}</button>
                <span className="text-slate-300">•</span>
                <button onClick={() => setScreen('capabilities')} className="hover:underline">Capabilities</button>
                <span className="text-slate-300">•</span>
                <button onClick={() => setScreen('model_registry')} className="hover:underline">Models</button>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Classification: {agentResult?.security?.classification || classification}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setScreen('understanding')}
                className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-lg shadow-emerald-800/20 transition flex items-center gap-2"
              >
                Start Task <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">QUICK TASKS</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                {
                  title: 'Analyze Document',
                  icon: FileText,
                  dest: 'document',
                  onClick: () => setScreen('document'),
                },
                {
                  title: 'Search Knowledge',
                  icon: Search,
                  dest: 'knowledge',
                  onClick: () => setScreen('knowledge'),
                },
                {
                  title: 'Write / Draft',
                  icon: Edit3,
                  dest: 'new_task',
                  onClick: () => {
                    setTaskMode('draft');
                    setTaskPrompt(
                      'Draft an internal approval note or engineering memo based on attached inputs and organizational SOPs.'
                    );
                    setScreen('new_task');
                  },
                },
                {
                  title: 'Run Calculation',
                  icon: Calculator,
                  dest: 'calculation_workspace',
                  onClick: () => {
                    setTaskMode('calculation');
                    setScreen('calculation_workspace');
                  },
                },
                {
                  title: 'Code & Verify',
                  icon: ShieldCheck,
                  dest: 'code_sandbox',
                  onClick: () => {
                    setTaskMode('coding');
                    setCodePrompt('Write a Python function with unit tests for...');
                    setScreen('code_sandbox');
                  },
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-xs font-bold text-left flex flex-col justify-between h-24 shadow-md shadow-emerald-950/10 transition"
                >
                  <item.icon className="w-4 h-4 opacity-80" />
                  <span className="leading-snug">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">ACTIVE WORK</span>
            <div
              onClick={() => setScreen('execution')}
              className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-md shadow-emerald-950/5 border border-emerald-100/60 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
            >
              <span className="text-sm font-bold text-slate-800">Inspection Report → Approval Note</span>
              <span className="text-xs font-bold px-4 py-1.5 rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50/60">
                PROCESSING
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. WEB 3 — CREATE A JOB                                       */}
      {/* ------------------------------------------------------------- */}
      {screen === 'new_task' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">NEW TASK</span>
              {taskMode && taskMode !== 'general' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {taskMode} mode
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Create a job</h1>
            <p className="text-slate-600 text-sm mt-1">Define the outcome, context and inputs.</p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">TASK</span>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-emerald-100/80">
              <textarea
                rows={3}
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">INPUTS</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={triggerFileUpload}
                className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80 cursor-pointer hover:border-emerald-300 transition"
              >
                <p className="text-sm font-bold text-slate-800">+ Attach files</p>
                <p className="text-xs text-emerald-700 mt-1">
                  {isAnalyzing || isUploading ? 'Extracting text...' : (selectedFile?.name || attachedFileName || 'PDF, image, spreadsheet, document')}
                </p>
              </div>

              <div
                onClick={() => setScreen('projects')}
                className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80 cursor-pointer hover:border-emerald-300 transition"
              >
                <p className="text-sm font-bold text-slate-800">Project: {projectTitle}</p>
                <p className="text-xs text-emerald-700 mt-1">Classification: determine automatically</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setScreen('command_center')}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => setScreen('understanding')}
              className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
            >
              Submit task <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. WEB 4 — TASK UNDERSTANDING                                 */}
      {/* ------------------------------------------------------------- */}
      {screen === 'understanding' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div>
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">TASK</span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Understanding</h1>
            <p className="text-slate-600 text-sm mt-1">Review what the system inferred before execution.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80">
              <span className="text-xs font-bold text-emerald-800 block">Task type</span>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {taskMode === 'draft'
                  ? 'Document Drafting & SOP Synthesis'
                  : taskMode === 'coding' || taskPrompt.toLowerCase().includes('code')
                  ? 'Code Review & Analysis'
                  : taskMode === 'calculation'
                  ? 'Engineering Calculation & Reasoning'
                  : taskPrompt.toLowerCase().includes('inspect')
                  ? 'Industrial Document Analysis'
                  : 'Engineering Reasoning'}
              </p>
            </div>

            <div className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80">
              <span className="text-xs font-bold text-emerald-800 block">Required inputs</span>
              <p className="text-sm font-medium text-slate-800 mt-1 truncate">
                {attachedFileName ? `${attachedFileName} (${attachedFileName.split('.').pop().toUpperCase()})` : 'Text Prompt'}
              </p>
            </div>

            <div className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80">
              <span className="text-xs font-bold text-emerald-800 block">Required capabilities</span>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {attachedFileName?.toLowerCase().endsWith('.png') || attachedFileName?.toLowerCase().endsWith('.jpg')
                  ? 'Vision OCR + Knowledge + Reasoning'
                  : 'Document Extraction + RAG + Reasoning'}
              </p>
            </div>

            <div className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80">
              <span className="text-xs font-bold text-emerald-800 block">Modality</span>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {attachedFileName?.toLowerCase().endsWith('.png') || attachedFileName?.toLowerCase().endsWith('.jpg')
                  ? 'Multimodal (Vision)'
                  : 'Text / Structured Document'}
              </p>
            </div>

            <div
              onClick={() => setScreen('risk_engine')}
              className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80 sm:col-span-1 cursor-pointer hover:border-emerald-300 transition"
            >
              <span className="text-xs font-bold text-emerald-800 block">Risk classification</span>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {agentResult?.risk?.risk_level ? `${agentResult.risk.risk_level} (${agentResult.risk.factors?.length || 0} factors)` : 'Evaluated at runtime'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setScreen('new_task')}
              className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
            >
              Modify
            </button>
            <button
              onClick={() => setScreen('plan')}
              className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
            >
              Start execution <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. WEB 5 — TASK PLAN                                          */}
      {/* ------------------------------------------------------------- */}
      {screen === 'plan' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div>
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">AGENT</span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Plan</h1>
            <p className="text-slate-600 text-sm mt-1">The proposed workflow before execution.</p>
          </div>

          <div className="space-y-3 py-2">
            {planSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm">
                <span className="text-xs font-mono font-bold text-emerald-800 w-6">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-slate-800 font-normal">{step}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setScreen('understanding')}
              className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTriggerAgentExecution}
              className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
            >
              Start execution <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. WEB 6 — AGENT EXECUTION WORKSPACE                          */}
      {/* ------------------------------------------------------------- */}
      {screen === 'execution' && (
        <div className="w-full max-w-4xl animate-in fade-in duration-200 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">ACTIVE TASK</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                {(agentResult?.audit_record?.task || taskPrompt)
                  ? ((agentResult?.audit_record?.task || taskPrompt).length > 60
                      ? `${(agentResult?.audit_record?.task || taskPrompt).substring(0, 60)}...`
                      : (agentResult?.audit_record?.task || taskPrompt))
                  : 'Inspection Report → Approval Note'}
              </h1>
              <p className="text-slate-600 text-sm mt-1">Agent execution with auditable action summaries.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScreen('activity')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                Trace
              </button>
              <button
                onClick={() => setScreen('provenance')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                Provenance
              </button>
              <button
                onClick={() => setScreen('command_center')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                Command Center
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Execution Error</span>
                <p className="text-xs text-rose-700 mt-0.5 font-mono">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-4 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-800 block">TASK</span>
                <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                  {(agentResult?.audit_record?.task || taskPrompt)
                    ? ((agentResult?.audit_record?.task || taskPrompt).length > 90
                        ? `${(agentResult?.audit_record?.task || taskPrompt).substring(0, 90)}...`
                        : (agentResult?.audit_record?.task || taskPrompt))
                    : 'No active task'}
                </p>
                {agentResult?.task_id && (
                  <span className="text-[10px] font-mono text-slate-500 block mt-1">
                    ID: {agentResult.task_id}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">INPUT</span>
                <p
                  onClick={() => setScreen('document')}
                  className="text-xs font-mono text-emerald-700 mt-1 underline cursor-pointer hover:text-emerald-900"
                >
                  {agentResult?.audit_record?.filename || attachedFileName}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">STATUS</span>
                <div className="mt-1.5">
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${
                    taskStatus === 'ERROR'
                      ? 'border-rose-300 text-rose-800 bg-rose-50/60'
                      : 'border-emerald-300 text-emerald-800 bg-emerald-50/60'
                  }`}>
                    {agentResult?.status ? agentResult.status.toUpperCase() : taskStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-2.5">
              {(agentResult?.stages && agentResult.stages.length > 0
                ? agentResult.stages
                : RUNTIME_STAGES
              ).map((stageItem, idx) => {
                const stageKey = stageItem.stage || stageItem.key;
                const stageLabel =
                  stageItem.label ||
                  stageKey.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                const isBackendStage = Boolean(agentResult?.stages);
                const isDone = isBackendStage
                  ? stageItem.status === 'COMPLETED'
                  : idx < activeStepIndex;
                const isCurrent = isBackendStage
                  ? false
                  : idx === activeStepIndex;
                const isFailed = isBackendStage && stageItem.status === 'FAILED';

                return (
                  <div key={stageKey} className="flex items-center justify-between text-sm py-0.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-800">{stageLabel}</span>
                      {isDone && <Check className="w-4 h-4 text-slate-800 stroke-[2.5]" />}
                      {isCurrent && (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block ml-0.5 animate-ping" />
                      )}
                      {isFailed && (
                        <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                      )}
                      {!isDone && !isCurrent && !isFailed && (
                        <Circle className="w-3.5 h-3.5 text-slate-300 stroke-[1.5]" />
                      )}
                    </div>
                    {isBackendStage && stageItem.status && (
                      <span className={`text-[10px] font-mono font-medium uppercase ${
                        stageItem.status === 'COMPLETED' ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {stageItem.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="md:col-span-3 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-800 block">TRUST</span>
                <p
                  onClick={() => setScreen('routing')}
                  className="text-sm font-bold text-slate-900 mt-1 cursor-pointer hover:underline"
                >
                  {agentResult?.model?.model || agentResult?.model?.selected_model
                    ? `Local (${agentResult.model.model || agentResult.model.selected_model})`
                    : typeof agentResult?.model === 'string'
                    ? `Local (${agentResult.model})`
                    : agentResult?.audit_record?.model
                    ? `Local (${agentResult.audit_record.model})`
                    : taskStatus === 'PROCESSING'
                    ? 'Routing model...'
                    : 'Local (Pending run)'}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">RISK</span>
                <div className="mt-1.5">
                  <span
                    onClick={() => setScreen('risk_engine')}
                    className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border tracking-wide cursor-pointer hover:border-emerald-400 ${
                      agentResult?.risk?.risk_level === 'HIGH'
                        ? 'border-rose-200 text-rose-700 bg-rose-50'
                        : agentResult?.risk?.risk_level === 'MEDIUM'
                        ? 'border-amber-200 text-amber-800 bg-amber-50'
                        : agentResult?.risk?.risk_level === 'LOW'
                        ? 'border-emerald-200 text-emerald-800 bg-emerald-50'
                        : 'border-slate-200 text-emerald-800'
                    }`}
                  >
                    {agentResult?.risk?.risk_level || (taskStatus === 'PROCESSING' ? 'EVALUATING' : 'Evaluated at runtime')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">Approval</span>
                <p
                  onClick={() => setScreen('approvals')}
                  className="text-sm font-medium text-emerald-700 underline cursor-pointer mt-1"
                >
                  {agentResult?.human_gate?.human_gate_status
                    ? (agentResult.human_gate.human_gate_status === 'NOT_REQUIRED'
                        ? 'Not required'
                        : agentResult.human_gate.human_gate_status === 'PENDING'
                        ? 'Review required'
                        : agentResult.human_gate.human_gate_status === 'APPROVED'
                        ? 'Approved'
                        : agentResult.human_gate.human_gate_status === 'REJECTED'
                        ? 'Rejected'
                        : agentResult.human_gate.human_gate_status.replace('_', ' '))
                    : (taskStatus === 'PROCESSING' ? 'Evaluating...' : 'Pending execution')}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">Delivery</span>
                <p
                  onClick={() => setScreen('deliverables')}
                  className="text-sm font-medium text-emerald-700 underline cursor-pointer mt-1"
                >
                  {agentResult?.delivery?.delivery_status
                    ? (agentResult.delivery.delivery_status === 'DELIVERED'
                        ? 'Delivered'
                        : agentResult.delivery.delivery_status === 'PENDING_APPROVAL'
                        ? 'Pending approval'
                        : agentResult.delivery.delivery_status.replace('_', ' '))
                    : (taskStatus === 'PROCESSING' ? 'In progress' : 'No deliverable available')}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-800 block">Provenance</span>
                <p
                  onClick={() => setScreen('provenance')}
                  className="text-sm font-medium text-emerald-700 underline cursor-pointer mt-1"
                >
                  {agentResult?.audit_record ? 'Recorded' : (taskStatus === 'PROCESSING' ? 'Recording...' : 'Pending execution')}
                </p>
              </div>
            </div>
          </div>

          {agentResult && (
            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border border-emerald-200 space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase">Agent Synthesis Deliverable</span>
                  {agentResult.verification?.status && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      agentResult.verification.status === 'PASSED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      Verification: {agentResult.verification.status}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setScreen('deliverables')}
                  className="text-xs font-bold text-emerald-700 underline flex items-center gap-1"
                >
                  View in Deliverables <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs font-mono text-slate-700 bg-slate-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed">
                {agentResult.answer}
              </p>
              {agentResult.deliverable?.filename && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-mono text-emerald-800 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {agentResult.deliverable.filename}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    SHA-256: {agentResult.deliverable.sha256 ? `${agentResult.deliverable.sha256.substring(0, 16)}...` : 'Not available'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. WEB 7 — AGENT ACTIVITY TIMELINE                            */}
      {/* ------------------------------------------------------------- */}
      {screen === 'activity' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">TRACE</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Agent activity</h1>
              <p className="text-slate-600 text-sm mt-1">Concise auditable actions — never private chain-of-thought.</p>
            </div>
            <button
              onClick={() => setScreen('execution')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {!agentResult ? (
              <div className="bg-white/95 rounded-2xl p-8 shadow-sm border border-emerald-100/80 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">No Active Task Activity</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Execute an agent workflow from the Command Center to inspect the live auditable activity trace.
                  </p>
                </div>
                <button
                  onClick={() => setScreen('command_center')}
                  className="py-2.5 px-6 rounded-xl font-semibold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition"
                >
                  Go to Command Center
                </button>
              </div>
            ) : (
              (agentResult.stages || []).map((st, idx) => {
                const stepNum = String(idx + 1).padStart(2, '0');
                const summary = st.details?.summary || st.details?.task || st.stage;
                const isCompleted = st.status === 'COMPLETED';
                const isFailed = st.status === 'FAILED';
                const statusColor = isCompleted ? 'text-emerald-700 font-semibold' : isFailed ? 'text-rose-700 font-bold' : 'text-amber-700 font-semibold';

                return (
                  <div
                    key={idx}
                    className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-emerald-800 w-6">{stepNum}</span>
                      <div>
                        <span className="text-sm text-slate-800 font-medium block">{st.stage}</span>
                        <span className="text-xs text-slate-500 block truncate max-w-[280px] sm:max-w-md">{summary}</span>
                      </div>
                    </div>
                    <span className={`text-xs ${statusColor}`}>{st.status}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. WEB 8 — AUTOMATIC MODEL ROUTING                            */}
      {/* ------------------------------------------------------------- */}
      {screen === 'routing' && (() => {
        const routedModel = agentResult?.model?.model || agentResult?.model?.selected_model || (typeof agentResult?.model === 'string' ? agentResult.model : null) || agentResult?.audit_record?.model;
        const routedTier = agentResult?.model?.tier || agentResult?.model?.role;
        const routedTemp = agentResult?.model?.temperature;
        const externalApiAllowed = agentResult?.model?.external_api_allowed;
        const classificationTier = agentResult?.security?.classification || classification;
        const models = modelRegistryData?.models || [];

        return (
          <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">MODEL FABRIC</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Automatic model routing</h1>
                <p className="text-slate-600 text-sm mt-1">Dynamic on-premise model selection based on task and classification.</p>
              </div>
              <button
                onClick={() => setScreen('execution')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-3">
                <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase block">
                  {routedModel ? 'CURRENT TASK ROUTE' : 'CONFIGURED LOCAL ROUTES'}
                </span>

                {routedModel ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Selected Model:</span>
                      <span className="font-mono font-bold text-slate-900">{routedModel}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Routing Tier:</span>
                      <span className="font-semibold text-emerald-800">{routedTier || 'general-reasoning'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Temperature:</span>
                      <span className="font-mono text-slate-800">{routedTemp ?? 0.7}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Classification:</span>
                      <span className="font-semibold text-slate-800">{classificationTier}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">External API:</span>
                      <span className="font-semibold text-emerald-700">
                        {externalApiAllowed ? 'Allowed' : 'Blocked (Local Only)'}
                      </span>
                    </div>
                  </div>
                ) : models.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {models.map((mod, idx) => (
                      <div key={idx} className={`flex justify-between py-1 ${idx < models.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <span className="text-slate-500 capitalize">{mod.role || 'On-Premise Model'}:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{mod.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${mod.available && modelRegistryData?.ollama_connected ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                            {mod.available && modelRegistryData?.ollama_connected ? 'Ready' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-xs text-slate-500 italic">
                    {modelRegistryLoading ? 'Probing configured model routes...' : 'Model registry data not available.'}
                  </div>
                )}
              </div>

              <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase block">
                    LOCAL EXECUTION ENGINE
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {routedModel ? routedModel : 'Ollama Model Fabric'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {routedModel
                      ? `Dynamically routed for current execution. External cloud fallbacks are disabled by architecture.`
                      : 'Tasks are evaluated at runtime by ModelRouter and dispatched to local Ollama open-weight models.'}
                  </p>
                </div>

                <button
                  onClick={() => setScreen('model_registry')}
                  className="mt-6 w-full py-3 px-5 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center justify-center gap-2"
                >
                  <Cpu className="w-4 h-4" /> View model registry
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 9. WEB 9 — MULTIMODAL DOCUMENT WORKSPACE                      */}
      {/* ------------------------------------------------------------- */}
      {screen === 'document' && (
        <div className="w-full max-w-4xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">MULTIMODAL</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Inspection report</h1>
              <p className="text-slate-600 text-sm mt-1">Move between original evidence, extracted information and sources.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              title="Back to Command Center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Document Upload & Analysis Action Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-emerald-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Document:</span>
                  <span className="text-xs font-bold text-slate-900 font-mono truncate">
                    {selectedFile?.name || attachedFileName || 'None'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for processing`
                    : (docContext ? 'Extracted text loaded • Attach a file to re-process' : 'No document attached. Click Attach File to select a report.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={triggerFileUpload}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{selectedFile ? 'Change File' : 'Attach File'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAnalyzeDocument(selectedFile)}
                disabled={isAnalyzing || !selectedFile}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                  isAnalyzing || !selectedFile
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analyze Error Banner */}
          {analyzeError && (
            <div className="bg-red-50/95 border border-red-200 text-red-700 text-xs rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="font-bold">Document Analysis Failed</p>
                <p className="font-mono text-[11px] break-all leading-relaxed">{analyzeError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-4 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  DOCUMENT PREVIEW
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {documentProcessed?.bytes ? `${documentProcessed.bytes} bytes` : `${(docContext || '').length} chars`}
                </span>
              </div>
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 max-h-64 overflow-y-auto space-y-2">
                <span className="text-[10px] font-bold font-mono text-slate-500 block uppercase truncate">
                  {selectedFile?.name || attachedFileName}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {isAnalyzing
                    ? 'Processing and extracting text content...'
                    : (docContext || 'No document content extracted. Attach a document to inspect.')}
                </p>
              </div>
            </div>

            <div className="md:col-span-4 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">DOCUMENT SOURCE</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono truncate">{selectedFile?.name || attachedFileName || 'None'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">PROCESSING STATUS</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isAnalyzing
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : documentProcessed?.status === 'FAILED'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isAnalyzing ? 'ANALYZING...' : (documentProcessed?.status || (docContext ? 'PROCESSED' : 'Not processed'))}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">INPUT SHA-256</span>
                <p className="text-[11px] font-mono text-slate-700 mt-0.5 break-all">
                  {documentProcessed?.sha256 || agentResult?.audit_record?.input_sha256 || 'Not computed'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">SECURITY CLASSIFICATION</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {agentResult?.security?.classification || classification}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">VERIFICATION STATE</span>
                <span className="font-semibold text-emerald-800 mt-0.5 block">
                  {agentResult?.verification?.status
                    ? `${agentResult.verification.status} (${agentResult.verification.grounded ? 'Grounded' : 'Ungrounded'})`
                    : 'Pending agent execution'}
                </span>
              </div>
            </div>

            <div className="md:col-span-4 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-4">
              <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase block">
                REFERENCED KNOWLEDGE
              </span>
              {ragStats?.documents && ragStats.documents.length > 0 ? (
                ragStats.documents.slice(0, 3).map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setKnowledgeSearchQuery(doc.filename || 'Maintenance SOP');
                      setScreen('knowledge');
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    <p className="text-sm font-medium text-emerald-800">{doc.filename || doc.document_id}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{doc.classification} • {doc.environment}</span>
                  </div>
                ))
              ) : (
                <div onClick={() => setScreen('knowledge')} className="cursor-pointer hover:underline">
                  <p className="text-sm font-medium text-slate-500">Query private RAG store</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. WEB 10 — ORGANIZATIONAL KNOWLEDGE (RAG)                  */}
      {/* ------------------------------------------------------------- */}
      {screen === 'knowledge' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">KNOWLEDGE</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Organizational knowledge</h1>
              <p className="text-slate-600 text-sm mt-1">Private manuals, SOPs, reports and correspondence.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* RAG Vectorstore & Collection Stats Banner */}
          <div className="bg-white/95 rounded-2xl p-4 shadow-sm border border-emerald-100/80 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">VECTOR STORE</span>
                <span className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                  {ragStatsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                  ) : ragStats ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  {ragStatsLoading ? 'Connecting...' : ragStats ? 'ChromaDB (Local)' : 'Unavailable'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">COLLECTION</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block">enterprise_knowledge</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">CHUNKS INDEXED</span>
                <span className="font-semibold text-emerald-700 font-mono mt-0.5 block">
                  {ragStats?.total_count ?? (ragStatsLoading ? '...' : 'Not available')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">EMBEDDING MODEL</span>
                <span className="font-semibold text-slate-800 font-mono mt-0.5 block truncate" title="all-MiniLM-L6-v2 (In-process PyTorch)">
                  all-MiniLM-L6-v2
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white/95 rounded-2xl p-4 shadow-sm border border-emerald-100/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={knowledgeSearchQuery}
              onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
              onKeyDown={handleExecuteRAGSearch}
              placeholder="Search organizational knowledge (e.g. Compressor C-204 maintenance SOP vibration)"
              className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder-slate-400"
            />
            <button
              onClick={handleExecuteRAGSearch}
              disabled={knowledgeLoading || !knowledgeSearchQuery.trim()}
              className="py-1.5 px-3 rounded-xl font-semibold text-xs text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 transition flex items-center gap-1 flex-shrink-0"
            >
              {knowledgeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search or Stats Error Banner */}
          {(knowledgeError || ragStatsError) && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{knowledgeError || ragStatsError}</span>
            </div>
          )}

          {/* Retrieval Results Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">
                RETRIEVAL EVIDENCE {knowledgeResults ? `(${knowledgeResults.length})` : ''}
              </span>
              <span className="text-[10px] text-slate-400">
                Clearance: <span className="font-semibold text-slate-700">{role}</span>
              </span>
            </div>

            {knowledgeLoading && (
              <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2 border border-emerald-100/80">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Searching private ChromaDB vectorstore with all-MiniLM-L6-v2...</span>
              </div>
            )}

            {!knowledgeLoading && knowledgeResults === null && (
              <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                Enter an engineering query or SOP topic above and press Enter to search the private ChromaDB index.
              </div>
            )}

            {!knowledgeLoading && knowledgeResults !== null && knowledgeResults.length === 0 && (
              <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                No matching knowledge chunks found in production index for current search under {role} permissions.
              </div>
            )}

            {!knowledgeLoading && knowledgeResults && knowledgeResults.map((item, i) => (
              <div
                key={i}
                className="bg-white/95 rounded-2xl p-5 shadow-sm border border-emerald-100/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-900 font-mono">
                    {item.metadata?.filename || item.metadata?.source || item.chunk_id}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.similarity_score !== undefined && (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(item.similarity_score * 100).toFixed(1)}% match
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {item.classification || item.metadata?.classification || 'GENERAL'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-800">
                      {item.metadata?.environment || 'production'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Indexed Repository Documents Section (Document Listing) */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">
              INDEXED REPOSITORY DOCUMENTS
            </span>
            {ragStats?.documents && ragStats.documents.length > 0 ? (
              <div className="space-y-2">
                {ragStats.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="bg-white/95 rounded-2xl px-5 py-3 shadow-sm border border-emerald-100/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold font-mono text-slate-900 block">{doc.filename || doc.document_id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {doc.classification}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Indexed ({doc.environment})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/95 rounded-2xl p-4 text-center text-xs text-slate-500 border border-slate-200">
                {ragStatsLoading ? 'Loading repository documents...' : 'No knowledge records available through the current API.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. WEB 11 — SECURE FILES                                    */}
      {/* ------------------------------------------------------------- */}
      {screen === 'files' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">FILES</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Secure files</h1>
              <p className="text-slate-600 text-sm mt-1">Documents and engineering inputs available to authorized work.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerFileUpload}
                className="py-2 px-3.5 bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Attach file
              </button>
              <button
                onClick={() => setScreen('command_center')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {['All', 'Recent', 'Projects', 'Sensitive', 'Critical'].map((pill) => (
              <button
                key={pill}
                onClick={() => setFileFilter(pill)}
                className={`py-2 px-5 text-xs font-bold rounded-2xl transition ${fileFilter === pill
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-600/20 text-emerald-900 hover:bg-emerald-600/30'
                  }`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {(() => {
              const workspaceFiles = [];
              if (selectedFile || attachedFileName) {
                const activeName = selectedFile?.name || attachedFileName;
                workspaceFiles.push({
                  name: activeName,
                  type: activeName.split('.').pop().toUpperCase(),
                  security: agentResult?.security?.classification || classification,
                  category: 'Recent',
                  badge: 'Active Input',
                });
              }
              if (ragStats?.documents) {
                ragStats.documents.forEach((doc) => {
                  workspaceFiles.push({
                    name: doc.filename || doc.document_id,
                    type: (doc.filename || '').split('.').pop().toUpperCase() || 'TXT',
                    security: doc.classification || 'GENERAL',
                    category: 'Projects',
                    badge: `Indexed (${doc.environment})`,
                  });
                });
              }
              if (agentResult?.deliverable?.filename) {
                workspaceFiles.push({
                  name: agentResult.deliverable.filename,
                  type: 'DOCX',
                  security: agentResult?.security?.classification || 'CONFIDENTIAL',
                  category: 'Critical',
                  badge: 'Deliverable',
                });
              }

              const filtered = workspaceFiles.filter(
                (f) => fileFilter === 'All' || f.category === fileFilter || f.security === fileFilter
              );

              return filtered.length > 0 ? (
                filtered.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (file.badge === 'Deliverable') {
                        setScreen('deliverables');
                      } else if (file.badge.includes('Indexed')) {
                        setKnowledgeSearchQuery(file.name);
                        setScreen('knowledge');
                      } else {
                        setAttachedFileName(file.name);
                        setScreen('document');
                      }
                    }}
                    className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{file.badge}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span className="text-slate-600 font-mono">{file.type}</span>
                      <span className="text-emerald-700 font-semibold">{file.security}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                  No files match the selected filter.
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. WEB 12 — PROJECTS                                         */}
      {/* ------------------------------------------------------------- */}
      {screen === 'projects' && (
        <div className="w-full max-w-3xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">PROJECTS</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Projects</h1>
              <p className="text-slate-600 text-sm mt-1">Organize tasks, files, knowledge and deliverables around real work.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projectsData.map((proj, idx) => (
              <div
                key={idx}
                className="bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between h-36"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-900">{proj.name}</h3>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    {proj.name === projectTitle ? 'Active Project • Current Workspace' : `${proj.status}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProjectTitle(proj.name);
                    setScreen('command_center');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 w-fit transition"
                >
                  Open project <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. WEB 13 — APPROVALS                                        */}
      {/* ------------------------------------------------------------- */}
      {screen === 'approvals' && (() => {
        const riskLevel = agentResult?.risk?.risk_level || 'UNKNOWN';
        const humanGateStatus = agentResult?.human_gate?.human_gate_status || (riskLevel === 'LOW' ? 'NOT_REQUIRED' : 'PENDING');
        const isLowRisk = riskLevel === 'LOW' || humanGateStatus === 'NOT_REQUIRED';
        const isPending = humanGateStatus === 'PENDING';
        const isApproved = humanGateStatus === 'APPROVED';
        const isRejected = humanGateStatus === 'REJECTED';
        const isEditRequired = humanGateStatus === 'EDIT_REQUIRED';
        const evidenceCount = agentResult ? (agentResult.retrieved_sources ?? (agentResult.verification?.evidence_sources ?? 0)) : 0;

        return (
          <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">GOVERNANCE</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Approvals</h1>
                <p className="text-slate-600 text-sm mt-1">Human review for consequential actions.</p>
              </div>
              <button
                onClick={() => setScreen('execution')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {approvalError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Authorization Notice</span>
                  <p className="text-xs text-rose-700 mt-0.5 font-mono">{approvalError}</p>
                </div>
              </div>
            )}

            {approvalSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-800 text-sm animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Action Completed</span>
                  <p className="text-xs text-emerald-700 mt-0.5">{approvalSuccessMessage}</p>
                </div>
              </div>
            )}

            <div className="bg-white/95 rounded-3xl p-8 shadow-sm border border-emerald-100/80 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {!agentResult
                    ? 'No Active Task Pending Approval'
                    : isLowRisk
                    ? 'Approval Not Required'
                    : isApproved
                    ? 'Task Approved'
                    : isRejected
                    ? 'Task Rejected'
                    : isEditRequired
                    ? 'Changes Requested'
                    : 'Approval Required'}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border tracking-wide ${
                      riskLevel === 'HIGH'
                        ? 'border-rose-200 text-rose-700 bg-rose-50'
                        : riskLevel === 'MEDIUM'
                        ? 'border-amber-200 text-amber-800 bg-amber-50'
                        : isLowRisk
                        ? 'border-emerald-200 text-emerald-800 bg-emerald-50'
                        : 'border-slate-200 text-slate-700 bg-slate-50'
                    }`}
                  >
                    {riskLevel}
                  </span>
                  {humanGateStatus && (
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 uppercase">
                      Gate: {humanGateStatus}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {taskPrompt || agentResult?.plan?.task || 'Inspection Report → Approval Note'}
                </h4>
                {agentResult?.task_id && (
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                    Task ID: {agentResult.task_id}
                  </span>
                )}
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  {!agentResult
                    ? 'No workflow has been executed yet. Initiate a task from the Command Center.'
                    : isLowRisk
                    ? (agentResult.human_gate?.gate_reason || 'Informational task meets low-risk criteria. Human gate not required for deliverable access.')
                    : isApproved
                    ? `Authorized by ${agentResult.human_gate?.approved_by || authLabel} (${agentResult.human_gate?.approver_role || role}). Controlled deliverable generated.`
                    : isRejected
                    ? `Rejected by ${agentResult.human_gate?.rejected_by || authLabel} (${agentResult.human_gate?.rejector_role || role}). Controlled deliverable blocked.`
                    : isEditRequired
                    ? `Revisions requested by ${agentResult.human_gate?.edit_requested_by || authLabel}: ${agentResult.human_gate?.edit_instructions || 'Edits required.'}`
                    : (agentResult.human_gate?.gate_reason || agentResult.human_gate?.summary || 'Recommendation prepared and held pending authorized human sign-off.')}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-emerald-800">
                <span onClick={() => setScreen('document')} className="cursor-pointer hover:underline">
                  Evidence • {evidenceCount} {evidenceCount === 1 ? 'source' : 'sources'}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Validation {agentResult?.verification?.status ? `• ${agentResult.verification.status}` : ''}
                </span>
                <span onClick={() => setScreen('provenance')} className="flex items-center gap-1 cursor-pointer hover:underline">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Provenance {agentResult?.audit_record ? '• Recorded' : ''}
                </span>
              </div>

              {isPending && (
                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Reviewer note / instructions (optional)"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {!agentResult && (
                  <button
                    onClick={() => setScreen('command_center')}
                    className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md transition"
                  >
                    Return to Command Center
                  </button>
                )}

                {agentResult && isLowRisk && (
                  <>
                    <button
                      onClick={() => setScreen('deliverables')}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
                    >
                      View deliverable <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setScreen('execution')}
                      className="py-3 px-6 rounded-2xl font-semibold text-emerald-800 text-sm bg-white border border-emerald-200 hover:bg-emerald-50 transition"
                    >
                      Back to execution
                    </button>
                  </>
                )}

                {agentResult && isPending && (
                  <>
                    <button
                      onClick={handleApproveTask}
                      disabled={approvalLoading}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Approve
                    </button>
                    <button
                      onClick={handleEditTask}
                      disabled={approvalLoading}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Request changes
                    </button>
                    <button
                      onClick={handleRejectTask}
                      disabled={approvalLoading}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 shadow-md transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Reject
                    </button>
                  </>
                )}

                {agentResult && isApproved && (
                  <>
                    <button
                      onClick={() => setScreen('deliverables')}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
                    >
                      Open deliverable <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setScreen('execution')}
                      className="py-3 px-6 rounded-2xl font-semibold text-emerald-800 text-sm bg-white border border-emerald-200 hover:bg-emerald-50 transition"
                    >
                      Back to execution
                    </button>
                  </>
                )}

                {agentResult && (isRejected || isEditRequired) && (
                  <>
                    <button
                      onClick={() => setScreen('execution')}
                      className="py-3 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-md transition"
                    >
                      Return to execution
                    </button>
                    <button
                      onClick={() => setScreen('command_center')}
                      className="py-3 px-6 rounded-2xl font-semibold text-slate-700 text-sm bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                      Command center
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 14. WEB 14 — DELIVERABLES                                     */}
      {/* ------------------------------------------------------------- */}
      {screen === 'deliverables' && (() => {
        const taskId = agentResult?.task_id;
        const riskLevel = agentResult?.risk?.risk_level || 'UNKNOWN';
        const humanGateStatus = agentResult?.human_gate?.human_gate_status || 'UNKNOWN';
        const deliveryStatus = agentResult?.delivery?.delivery_status || 'UNKNOWN';
        const deliverable = agentResult?.deliverable;
        const hasDeliverable = Boolean(deliverable && deliverable.filename);
        const isPending = humanGateStatus === 'PENDING' || deliveryStatus === 'PENDING_APPROVAL';
        const isRejected = humanGateStatus === 'REJECTED' || deliveryStatus === 'REJECTED';
        const isEditRequired = humanGateStatus === 'EDIT_REQUIRED' || deliveryStatus === 'EDIT_REQUIRED';

        return (
          <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">OUTPUT</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Deliverables</h1>
                <p className="text-slate-600 text-sm mt-1">Real files produced by controlled workflows.</p>
              </div>
              <button
                onClick={() => setScreen('command_center')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!agentResult && (
                <div className="bg-white/95 rounded-2xl p-8 shadow-sm border border-emerald-100/80 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">No Active Deliverable</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      No agent workflow has been executed yet. Initiate a task from the Command Center to produce controlled deliverables.
                    </p>
                  </div>
                  <button
                    onClick={() => setScreen('command_center')}
                    className="py-2.5 px-6 rounded-xl font-semibold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition"
                  >
                    Go to Command Center
                  </button>
                </div>
              )}

              {agentResult && isPending && (
                <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-amber-200/80 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-900 uppercase">Task: {taskId}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {riskLevel} RISK
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {taskPrompt || agentResult?.plan?.task || 'Controlled Inspection Deliverable'}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Pending Approval
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DELIVERY STATUS</span>
                      <span className="font-semibold text-slate-800">{deliveryStatus.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">HUMAN APPROVAL</span>
                      <span className="font-semibold text-amber-700">Required (Pending)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SHA-256 HASH</span>
                      <span className="font-mono text-slate-500 text-[11px]">Held (Not Generated)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOCX FILE</span>
                      <span className="font-semibold text-slate-500">Awaiting Sign-off</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {agentResult?.delivery?.delivery_message || 'Deliverable generation is held pending authorized human review. Complete the approval workflow to generate the controlled DOCX.'}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Sign-off required by ADMIN or REVIEWER
                    </span>
                    <button
                      onClick={() => setScreen('approvals')}
                      className="py-2 px-5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition flex items-center gap-1"
                    >
                      Review in Approvals <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {agentResult && isRejected && (
                <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-rose-200/80 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-800">Task: {taskId}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                          {riskLevel} RISK
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {taskPrompt || agentResult?.plan?.task || 'Controlled Inspection Deliverable'}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                      Rejected / Blocked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DELIVERY STATUS</span>
                      <span className="font-semibold text-rose-700">REJECTED</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">HUMAN APPROVAL</span>
                      <span className="font-semibold text-rose-700">Denied</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SHA-256 HASH</span>
                      <span className="font-mono text-slate-500 text-[11px]">Blocked</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOCX FILE</span>
                      <span className="font-semibold text-rose-600">Generation Blocked</span>
                    </div>
                  </div>

                  <p className="text-xs text-rose-700 leading-relaxed">
                    {agentResult?.delivery?.delivery_message || 'Controlled deliverable generation was rejected by authorized human reviewer. No document generated.'}
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setScreen('command_center')}
                      className="py-2 px-5 rounded-xl font-bold text-white text-xs bg-slate-700 hover:bg-slate-800 shadow-sm transition"
                    >
                      Back to Command Center
                    </button>
                  </div>
                </div>
              )}

              {agentResult && isEditRequired && (
                <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-amber-200/80 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-800">Task: {taskId}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                          {riskLevel} RISK
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {taskPrompt || agentResult?.plan?.task || 'Controlled Inspection Deliverable'}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Held (Edit Required)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DELIVERY STATUS</span>
                      <span className="font-semibold text-amber-800">EDIT REQUIRED</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">HUMAN APPROVAL</span>
                      <span className="font-semibold text-amber-800">Changes Requested</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SHA-256 HASH</span>
                      <span className="font-mono text-slate-500 text-[11px]">Held Pending Edit</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOCX FILE</span>
                      <span className="font-semibold text-amber-700">Pending Revision</span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-900 leading-relaxed">
                    {agentResult?.delivery?.delivery_message || `Edits requested: ${agentResult?.human_gate?.edit_instructions || 'Adjustments required.'}`}
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setScreen('execution')}
                      className="py-2 px-5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition"
                    >
                      Revise in Execution
                    </button>
                  </div>
                </div>
              )}

              {agentResult && hasDeliverable && (
                <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-emerald-200 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-800">Task: {taskId}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          riskLevel === 'LOW' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {riskLevel} RISK
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        {deliverable.filename}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {agentResult?.verification?.status === 'PASSED' ? 'Verified' : (agentResult?.verification?.status || 'Completed')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DELIVERY STATUS</span>
                      <span className="font-semibold text-emerald-700">DELIVERED</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">HUMAN APPROVAL</span>
                      <span className="font-semibold text-slate-800">
                        {humanGateStatus === 'NOT_REQUIRED' ? 'Not Required (Low Risk)' : 'Approved'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">FILE SIZE</span>
                      <span className="font-semibold text-slate-800">
                        {deliverable.file_size_bytes ? `${Math.round(deliverable.file_size_bytes / 1024)} KB` : 'Not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">GENERATED AT</span>
                      <span className="font-semibold text-slate-800">
                        {deliverable.generated_at ? new Date(deliverable.generated_at).toLocaleTimeString() : 'Not available'}
                      </span>
                    </div>
                  </div>

                  {/* SHA-256 Provenance Row */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span className="uppercase">SHA-256 Provenance Hash</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" /> Authenticated File
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-700 break-all select-all">
                      {deliverable.sha256}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500">
                      Format: <span className="font-mono text-[11px] font-semibold text-slate-700">DOCX</span>
                    </span>
                    <button
                      onClick={() => setSelectedDeliverable(selectedDeliverable === deliverable.filename ? null : deliverable.filename)}
                      className="py-2 px-6 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition"
                    >
                      {selectedDeliverable === deliverable.filename ? 'Hide details' : 'Open'}
                    </button>
                  </div>

                  {/* Expanded Deliverable Inspector */}
                  {selectedDeliverable === deliverable.filename && (
                    <div className="mt-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                          Deliverable Vault Record
                        </span>
                        <span className="text-emerald-800 text-[10px] font-mono">
                          Task ID: {taskId}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-700 text-xs">
                        <p><span className="font-semibold text-slate-900">Filename:</span> {deliverable.filename}</p>
                        <p><span className="font-semibold text-slate-900">Format:</span> Microsoft Word (.docx) Document</p>
                        <p><span className="font-semibold text-slate-900">Integrity:</span> SHA-256 verified against audit registry</p>
                        <p><span className="font-semibold text-slate-900">Air-gap Storage Note:</span> Document persisted locally to sovereign deliverables vault. Direct browser binary streaming endpoint is not exposed on this on-premise node.</p>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800 font-medium">
                          Authorized Role: {role}
                        </span>
                        <button
                          onClick={() => setScreen('provenance')}
                          className="text-emerald-800 font-bold text-xs underline hover:text-emerald-950"
                        >
                          View Full Audit Provenance
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 15. WEB 15 — PROVENANCE                                       */}
      {/* ------------------------------------------------------------- */}
      {screen === 'provenance' && (() => {
        const audit = agentResult?.audit_record;
        const taskId = agentResult?.task_id || audit?.task_id;
        const inputFilename = audit?.filename || attachedFileName || 'No document attached';
        const inputHash = audit?.input_sha256;
        const evidenceCount = audit?.retrieved_evidence ?? agentResult?.retrieved_sources ?? 0;
        const modelUsed = audit?.model || agentResult?.model?.model;
        const verificationStatus = audit?.verification?.status || agentResult?.verification?.status;
        const isGrounded = audit?.verification?.grounded ?? agentResult?.verification?.grounded;
        const riskLevel = audit?.risk_assessment?.risk_level || agentResult?.risk?.risk_level;
        const humanGateStatus = audit?.human_gate?.human_gate_status || agentResult?.human_gate?.human_gate_status;
        const humanApproval = Boolean(audit?.human_approval ?? agentResult?.human_gate?.human_approval ?? false);
        const deliverableObj = agentResult?.deliverable;
        const outputDocxSha = audit?.output_docx_sha256 || deliverableObj?.sha256;
        const outputAnswerSha = audit?.output_sha256;
        const outputFilename = deliverableObj?.filename || (outputDocxSha ? `${taskId}_deliverable.docx` : null);
        const deliveryStatus = audit?.delivery_status || agentResult?.delivery?.delivery_status || (outputDocxSha ? 'DELIVERED' : (humanGateStatus === 'PENDING' ? 'PENDING_APPROVAL' : humanGateStatus));
        const timestamp = audit?.timestamp;

        // Dynamic lineage steps based solely on real backend data
        const dynamicSteps = agentResult ? [
          {
            id: '01',
            name: 'INPUT REFERENCE',
            value: inputFilename,
            subtext: inputHash ? `SHA-256: ${inputHash.slice(0, 12)}...${inputHash.slice(-6)}` : 'Not available from current task response',
            status: 'COMPLETED',
          },
          {
            id: '02',
            name: 'CLASSIFICATION',
            value: agentResult.security?.classification ? `${agentResult.security.classification} clearance` : 'Not available from current task response',
            subtext: agentResult.security?.restricted_reason || 'Local classification enforced',
            status: 'COMPLETED',
          },
          {
            id: '03',
            name: 'INPUT PROCESSING',
            value: 'Local Text & Context Ingested',
            subtext: docContext ? `${docContext.slice(0, 45)}...` : 'Extracted',
            status: 'COMPLETED',
          },
          {
            id: '04',
            name: 'KNOWLEDGE RETRIEVAL',
            value: `${evidenceCount} authoritative ${evidenceCount === 1 ? 'chunk' : 'chunks'} retrieved`,
            subtext: 'Private RAG Vectorstore',
            status: 'COMPLETED',
          },
          {
            id: '05',
            name: 'SOVEREIGN MODEL',
            value: modelUsed || 'Not available from current task response',
            subtext: 'Local Ollama air-gapped runtime',
            status: modelUsed ? 'COMPLETED' : 'UNKNOWN',
          },
          {
            id: '06',
            name: 'TOOL EXECUTION',
            value: agentResult.action?.action_type || 'Deterministic Analysis',
            subtext: 'Controlled execution sandbox',
            status: 'COMPLETED',
          },
          {
            id: '07',
            name: 'VALIDATION GATE',
            value: verificationStatus ? `${verificationStatus} (${isGrounded ? 'Grounded' : 'Ungrounded'})` : 'Not available from current task response',
            subtext: isGrounded ? 'Claims verified against RAG sources' : 'Grounding unverified',
            status: verificationStatus === 'PASSED' ? 'COMPLETED' : (verificationStatus ? 'FAILED' : 'UNKNOWN'),
            color: verificationStatus === 'PASSED' ? 'text-emerald-700' : 'text-amber-700',
          },
          {
            id: '08',
            name: 'RISK ASSESSMENT',
            value: riskLevel ? `${riskLevel} RISK` : 'Not available from current task response',
            subtext: audit?.risk_assessment?.operational_impact ? `Operational impact: ${audit.risk_assessment.operational_impact}` : 'Risk evaluated',
            status: 'COMPLETED',
            color: riskLevel === 'HIGH' ? 'text-rose-700' : (riskLevel === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'),
          },
          {
            id: '09',
            name: 'HUMAN GATE',
            value: (() => {
              if (humanGateStatus === 'NOT_REQUIRED') return 'Not Required (Autonomous)';
              if (humanGateStatus === 'APPROVED' || humanApproval === true) return 'APPROVED (Sign-off Verified)';
              if (humanGateStatus === 'PENDING') return 'PENDING (Awaiting Sign-off)';
              if (humanGateStatus === 'REJECTED') return 'REJECTED (Generation Blocked)';
              if (humanGateStatus === 'EDIT_REQUIRED') return 'EDIT REQUIRED (Held)';
              return humanGateStatus || 'Not available from current task response';
            })(),
            subtext: (() => {
              if (humanApproval === true) return 'Authorized by reviewer';
              if (humanGateStatus === 'PENDING') return 'Human approval required before delivery';
              if (humanGateStatus === 'NOT_REQUIRED') return 'Autonomous delivery allowed for low risk';
              return 'Human gate evaluation recorded';
            })(),
            status: (humanApproval === true || humanGateStatus === 'NOT_REQUIRED') ? 'COMPLETED' : (humanGateStatus === 'PENDING' ? 'PENDING' : 'HELD'),
            color: (humanApproval === true || humanGateStatus === 'NOT_REQUIRED') ? 'text-emerald-700' : (humanGateStatus === 'PENDING' ? 'text-amber-700 font-semibold' : 'text-rose-700'),
          },
          {
            id: '10',
            name: 'FINAL DELIVERABLE',
            value: outputFilename || (outputDocxSha ? 'Controlled DOCX' : (humanGateStatus === 'PENDING' ? 'Held Pending Human Approval' : 'No deliverable generated')),
            subtext: outputDocxSha ? `SHA-256: ${outputDocxSha.slice(0, 12)}...${outputDocxSha.slice(-6)}` : (humanGateStatus === 'PENDING' ? 'Document held in sovereign vault pending sign-off' : 'Not generated'),
            status: outputDocxSha ? 'COMPLETED' : (humanGateStatus === 'PENDING' ? 'HELD' : 'BLOCKED'),
            color: outputDocxSha ? 'text-emerald-700' : 'text-slate-500',
          },
        ] : [];

        return (
          <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">AUDIT & PROVENANCE</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Provenance</h1>
                <p className="text-slate-600 text-sm mt-1">
                  Cryptographic lineage and execution chain for sovereign tasks.
                </p>
              </div>
              <button
                onClick={() => setScreen('execution')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {!agentResult ? (
              <div className="bg-white/95 rounded-2xl p-8 shadow-sm border border-emerald-100/80 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">No Active Task Provenance</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Execute an agent workflow to generate an auditable cryptographic provenance chain.
                  </p>
                </div>
                <button
                  onClick={() => setScreen('command_center')}
                  className="py-2.5 px-6 rounded-xl font-semibold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition"
                >
                  Go to Command Center
                </button>
              </div>
            ) : (
              <>
                {/* Task Provenance Summary Card */}
                <div className="bg-white/95 rounded-2xl p-4 shadow-sm border border-emerald-100/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">TASK IDENTIFIER</span>
                      <span className="font-mono font-bold text-slate-800 text-xs select-all">
                        {taskId || 'Not available from current task response'}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">AUDIT TIMESTAMP</span>
                      <span className="font-semibold text-slate-700 text-xs">
                        {timestamp ? new Date(timestamp).toLocaleString() : 'Not available from current task response'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      Audit Record: <span className="font-mono text-emerald-800 font-semibold">{taskId ? `AUDIT-${taskId}` : 'Not available'}</span>
                    </span>
                    <span>
                      Delivery Status:{' '}
                      <span className={`font-semibold ${
                        deliveryStatus === 'DELIVERED' ? 'text-emerald-700' :
                        deliveryStatus === 'PENDING_APPROVAL' ? 'text-amber-700' :
                        deliveryStatus === 'REJECTED' ? 'text-rose-700' : 'text-slate-700'
                      }`}>
                        {deliveryStatus ? deliveryStatus.replace('_', ' ') : 'Not available'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Lineage Steps List */}
                <div className="space-y-2 py-1">
                  {dynamicSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start justify-between text-xs py-2 px-3 rounded-xl hover:bg-white/60 transition border border-transparent hover:border-emerald-100/60"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono font-bold text-emerald-800 w-5 mt-0.5">{step.id}</span>
                        <div>
                          <span className="font-bold text-slate-800 tracking-wide block">{step.name}</span>
                          {step.subtext && (
                            <span className="text-[11px] text-slate-500 font-mono block mt-0.5 max-w-[280px] sm:max-w-md truncate">
                              {step.subtext}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <span className={`font-medium block ${step.color || 'text-emerald-800/90'}`}>
                          {step.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Dynamic Seal Pill */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  {deliveryStatus === 'DELIVERED' && verificationStatus === 'PASSED' ? (
                    <span className="text-xs font-bold px-6 py-2 rounded-full border border-emerald-300 text-emerald-800 bg-white/95 shadow-sm tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      AUDIT CHAIN COMPLETE • VERIFIED
                    </span>
                  ) : humanGateStatus === 'PENDING' ? (
                    <span className="text-xs font-bold px-6 py-2 rounded-full border border-amber-300 text-amber-800 bg-amber-50/95 shadow-sm tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                      PROVENANCE RECORDED • PENDING APPROVAL
                    </span>
                  ) : humanGateStatus === 'REJECTED' ? (
                    <span className="text-xs font-bold px-6 py-2 rounded-full border border-rose-300 text-rose-800 bg-rose-50/95 shadow-sm tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                      PROVENANCE RECORDED • REJECTED
                    </span>
                  ) : humanGateStatus === 'EDIT_REQUIRED' ? (
                    <span className="text-xs font-bold px-6 py-2 rounded-full border border-amber-300 text-amber-800 bg-amber-50/95 shadow-sm tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                      PROVENANCE RECORDED • EDIT REQUIRED
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-6 py-2 rounded-full border border-emerald-200 text-emerald-800 bg-white/95 shadow-sm tracking-wider">
                      PROVENANCE RECORDED
                    </span>
                  )}

                  {/* Cryptographic Hashes Toggle */}
                  <button
                    onClick={() => setShowCryptoDetails(!showCryptoDetails)}
                    className="text-xs text-emerald-800/80 hover:text-emerald-950 font-medium underline transition"
                  >
                    {showCryptoDetails ? 'Hide Cryptographic Hashes' : 'Inspect Cryptographic Hashes'}
                  </button>
                </div>

                {/* Expanded Cryptographic Detail Panel */}
                {showCryptoDetails && (
                  <div className="p-4 bg-white/90 border border-emerald-200/80 rounded-2xl text-xs space-y-3 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                      <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-700" />
                        Cryptographic Verification Details
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">SHA-256 Digest Engine</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">INPUT SHA-256 (Task + Document)</span>
                        <p className="font-mono text-[11px] text-slate-800 break-all select-all bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-0.5">
                          {inputHash || 'Not available from current task response'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">REASONING OUTPUT SHA-256</span>
                        <p className="font-mono text-[11px] text-slate-800 break-all select-all bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-0.5">
                          {outputAnswerSha || 'Not available from current task response'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">DELIVERABLE DOCX SHA-256</span>
                        <p className="font-mono text-[11px] text-slate-800 break-all select-all bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-0.5">
                          {outputDocxSha || (humanGateStatus === 'PENDING' ? 'Held pending human approval (no deliverable generated)' : 'Not available from current task response')}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Lineage Integrity: <span className="text-emerald-700 font-semibold">100% On-Premise Audit Ledger</span></span>
                        <span>Air-gap Sovereign Storage</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 16. WEB 16 — SOVEREIGN SECURITY                               */}
      {/* ------------------------------------------------------------- */}
      {screen === 'security' && (
        <div className="w-full max-w-3xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">SECURITY</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Sovereign security</h1>
              <p className="text-slate-600 text-sm mt-1">Make the trust boundary visible without clutter.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">SECURE</h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Air-gapped / local execution</p>
              </div>

              <div className="space-y-3 pt-2">
                {['Data', 'Models', 'Knowledge', 'Tools', 'Processing', 'Outputs'].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-800">{item}</span>
                    <span className="text-emerald-700 flex items-center gap-1">
                      LOCAL <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  NETWORK MONITOR
                </span>

                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-emerald-800">External connections</span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Not instrumented
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-emerald-800">External AI/API calls</span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Not instrumented
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-emerald-800">Data egress</span>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Not instrumented
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-emerald-800">Internal activity</span>
                    <span className="text-sm font-bold text-slate-900">
                      {taskStatus === 'PROCESSING' ? 'Processing' : (agentResult ? 'Active (Task Logged)' : 'Idle')}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-6 pt-3 border-t border-slate-100 font-medium">
                Network telemetry is not instrumented on this node. External egress is blocked by local-only architectural policy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 17. WEB 17 — RISK ENGINE                                      */}
      {/* ------------------------------------------------------------- */}
      {screen === 'risk_engine' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">GOVERNANCE</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Risk engine</h1>
              <p className="text-slate-600 text-sm mt-1">Risk determines when review or intervention is required.</p>
            </div>
            <button
              onClick={() => setScreen('understanding')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {riskTiers.map((tier, idx) => (
              <div
                key={idx}
                className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center gap-6"
              >
                <span className="text-xs font-bold px-5 py-1.5 rounded-full border border-slate-300 text-emerald-800 tracking-wide w-28 text-center">
                  {tier.label}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {tier.description}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <p className="text-sm font-bold text-emerald-950">
              {agentResult ? (
                (() => {
                  const rLevel = agentResult.risk?.risk_level || agentResult.audit_record?.risk_assessment?.risk_level || 'LOW';
                  const hStatus = agentResult.human_gate?.human_gate_status || agentResult.audit_record?.human_gate?.human_gate_status || 'NOT_REQUIRED';
                  return `Current task: ${rLevel} → ${hStatus === 'NOT_REQUIRED' ? 'autonomous execution (no human gate)' : 'human approval required'}`;
                })()
              ) : (
                'No active task evaluated. Initiate a task to assess operational risk.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 18. WEB 18 — CODE WORKSPACE (SANDBOX)                         */}
      {/* ------------------------------------------------------------- */}
      {screen === 'code_sandbox' && (
        <div className="w-full max-w-4xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">DEVELOPMENT</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Code workspace</h1>
              <p className="text-slate-600 text-sm mt-1">Generate, execute and verify code in an isolated sandbox.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              aria-label="Back to Command Center"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Left Prompt Column */}
            <div className="md:col-span-4 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase block">Code specification</span>
                <textarea
                  value={codePrompt}
                  onChange={(e) => setCodePrompt(e.target.value)}
                  rows={6}
                  placeholder="Describe the Python function or script to generate..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed"
                />
              </div>

              <button
                type="button"
                disabled={codeLoading || !codePrompt.trim()}
                onClick={handleGenerateCode}
                className="w-full py-3.5 px-5 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-800/20 transition flex items-center justify-center gap-2"
              >
                {codeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Generate & Verify
                  </>
                )}
              </button>
            </div>

            {/* Middle Code Editor Column */}
            <div className="md:col-span-5 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 font-mono text-xs text-emerald-700 leading-relaxed flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100/80">
                <span className="font-sans font-bold text-xs text-slate-700 uppercase tracking-wider">Editor & Output</span>
                {routedModel && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Model: {routedModel}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto max-h-[380px] space-y-1">
                {codeLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 font-sans">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                    <span className="text-xs font-semibold">Generating & verifying in sandbox...</span>
                  </div>
                ) : codeError ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-sans text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Generation failed</p>
                      <p className="mt-1 font-mono text-[11px] break-all">{codeError}</p>
                    </div>
                  </div>
                ) : codeOutput ? (
                  codeOutput.split('\n').map((line, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="text-slate-400 w-5 text-right select-none shrink-0">{idx + 1}</span>
                      <span className="text-emerald-700 font-medium whitespace-pre break-all">{line}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 font-sans text-xs italic">
                    Click "Generate & Verify" to synthesize and test code in sandbox.
                  </div>
                )}
              </div>
            </div>

            {/* Right Sandbox Policy Column */}
            <div className="md:col-span-3 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-emerald-800 tracking-wider block">ISOLATED</span>
                  <span className="text-[11px] text-slate-500">Air-gapped execution</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-emerald-800 tracking-wider block">Network OFF</span>
                  <span className="text-[11px] text-slate-500">Zero egress policy</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-emerald-800 tracking-wider block">Files TEMP</span>
                  <span className="text-[11px] text-slate-500">Ephemeral sandbox</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <span>Sandbox Verification</span>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>

              {routedModel && (
                <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold text-emerald-800 block">Routed Model</span>
                  <span className="font-mono">{routedModel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 19. WEB 19 — CAPABILITIES                                     */}
      {/* ------------------------------------------------------------- */}
      {screen === 'capabilities' && (() => {
        const models = modelRegistryData?.models || [];
        const isOllamaConnected = !!modelRegistryData?.ollama_connected;

        const reasoningModel = models.find((m) => m.role?.includes('reasoning') || m.name?.includes('qwen3:4b'));
        const visionModel = models.find((m) => m.role?.includes('vision') || m.name?.includes('vl'));
        const codingModel = models.find((m) => m.role?.includes('coding') || m.name?.includes('coder'));

        const getModelCapabilityStatus = (modelItem) => {
          if (modelRegistryLoading) return { status: 'Checking...', color: 'text-slate-500' };
          if (!modelRegistryData) return { status: 'Not available', color: 'text-slate-500' };
          if (!isOllamaConnected) return { status: 'Unavailable (Ollama Offline)', color: 'text-rose-700' };
          if (!modelItem) return { status: 'Not detected', color: 'text-amber-700' };
          return modelItem.available
            ? { status: 'Available', color: 'text-emerald-700' }
            : { status: modelItem.installed ? 'Installed (Offline)' : 'Not Installed', color: 'text-rose-700' };
        };

        const reasoningStatus = getModelCapabilityStatus(reasoningModel);
        const visionStatus = getModelCapabilityStatus(visionModel);
        const codingStatus = getModelCapabilityStatus(codingModel);

        const capabilitiesData = [
          { title: 'Private RAG Search (ChromaDB)', category: 'Knowledge', status: 'Available', color: 'text-emerald-700' },
          { title: 'Local Document OCR & Extraction', category: 'Ingestion', status: 'Available', color: 'text-emerald-700' },
          {
            title: `Sovereign Reasoning (${reasoningModel?.name || 'Local LLM'})`,
            category: 'Reasoning',
            status: reasoningStatus.status,
            color: reasoningStatus.color,
          },
          {
            title: `Multimodal Vision (${visionModel?.name || 'Local Vision'})`,
            category: 'Vision',
            status: visionStatus.status,
            color: visionStatus.color,
          },
          {
            title: `Code Generation & Review (${codingModel?.name || 'Local Coder'})`,
            category: 'Coding',
            status: codingStatus.status,
            color: codingStatus.color,
          },
          { title: 'Controlled Deliverable Generator (.docx)', category: 'Delivery', status: 'Available', color: 'text-emerald-700' },
          { title: 'Engineering Verification Engine', category: 'Validation', status: 'Available', color: 'text-emerald-700' },
          { title: 'Human Governance Gate (RBAC)', category: 'Governance', status: 'Available', color: 'text-emerald-700' },
          { title: 'Spreadsheet Calculation', category: 'Data', status: 'Not instrumented', color: 'text-slate-500' },
          { title: 'External Cloud APIs', category: 'Network', status: 'Blocked by Policy', color: 'text-rose-700' },
        ];

        return (
          <div className="w-full max-w-3xl animate-in fade-in duration-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">CAPABILITY FABRIC</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Capabilities</h1>
                <p className="text-slate-600 text-sm mt-1">Controlled organizational tools available to agents.</p>
              </div>
              <button
                onClick={() => setScreen('command_center')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilitiesData.map((tool, idx) => (
                <div
                  key={idx}
                  className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{tool.title}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{tool.category}</span>
                  </div>
                  <span className={`text-xs font-semibold ${tool.color}`}>{tool.status}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
              Agent tools execute deterministically on-premise. Cloud API endpoints are disabled by policy.
            </p>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 20. WEB 20 — MODEL REGISTRY                                   */}
      {/* ------------------------------------------------------------- */}
      {screen === 'model_registry' && (
        <div className="w-full max-w-3xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">MODEL FABRIC</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Model registry</h1>
              <p className="text-slate-600 text-sm mt-1">Verified on-premise local open-weight models.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Model Fabric Daemon Status Card */}
          <div className="bg-white/95 rounded-2xl p-4 shadow-sm border border-emerald-100/80 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">OLLAMA DAEMON</span>
                <span className={`font-semibold flex items-center gap-1 mt-0.5 ${
                  modelRegistryData?.ollama_connected ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {modelRegistryLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : modelRegistryData?.ollama_connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {modelRegistryLoading
                    ? 'Probing daemon...'
                    : modelRegistryData?.ollama_connected
                    ? 'Connected (127.0.0.1:11434)'
                    : 'Unreachable'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">ARCHITECTURE</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">Air-gapped / Local Only</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">CLOUD FALLBACK</span>
                <span className="font-semibold text-emerald-700 mt-0.5 block">Disabled</span>
              </div>
            </div>
          </div>

          {/* Model Registry Cards List */}
          {modelRegistryError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Daemon Error: {modelRegistryError}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Real Ollama Models from GET /api/v1/models/status */}
            {modelRegistryLoading && !modelRegistryData && (
              <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2 border border-emerald-100/80">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Querying local Ollama model registry...</span>
              </div>
            )}

            {modelRegistryData?.models && modelRegistryData.models.length > 0 ? (
              modelRegistryData.models.map((mod, idx) => {
                const isAvailable = mod.available && modelRegistryData?.ollama_connected;
                return (
                  <div
                    key={idx}
                    className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-bold font-mono text-slate-900 block">{mod.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{mod.role}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        isAvailable
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                          : 'text-rose-700 bg-rose-50 border-rose-200'
                      }`}
                    >
                      {isAvailable
                        ? 'Ready (Local)'
                        : !modelRegistryData.ollama_connected
                        ? 'Unavailable (Daemon Unreachable)'
                        : mod.installed
                        ? 'Installed (Offline)'
                        : 'Not Installed'}
                    </span>
                  </div>
                );
              })
            ) : !modelRegistryLoading && (
              <div className="bg-white/95 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
                No model registry data available from local daemon.
              </div>
            )}

            {/* Local In-Process Embedding Model */}
            <div className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold font-mono text-slate-900 block">all-MiniLM-L6-v2</span>
                <span className="text-xs text-slate-500 font-medium">retrieval / private_embeddings (In-process PyTorch)</span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-300">
                Active (In-process PyTorch)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Host: <span className="font-mono text-slate-700">127.0.0.1:11434</span> (Air-gap boundary)
            </span>
            <button
              onClick={fetchModelStatus}
              disabled={modelRegistryLoading}
              className="py-2.5 px-5 rounded-2xl font-semibold text-white text-xs bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${modelRegistryLoading ? 'animate-spin' : ''}`} />
              Refresh status
            </button>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
            Models are loaded from local Ollama storage and configured in sovereign_ai/config/models.json. Cloud API egress is blocked by policy.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 21. OPERATIONS / ACTIVITY                                     */}
      {/* ------------------------------------------------------------- */}
      {screen === 'operations' && (
        <div className="w-full max-w-2xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">OPERATIONS</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Activity</h1>
              <p className="text-slate-600 text-sm mt-1">Monitor work that is running, waiting or blocked.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {['Processing', 'Pending', 'Completed', 'Blocked'].map((pill) => (
              <button
                key={pill}
                onClick={() => setOperationFilter(pill)}
                className={`py-2 px-6 text-xs font-bold rounded-2xl transition ${operationFilter === pill
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-600/20 text-emerald-900 hover:bg-emerald-600/30'
                  }`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {(() => {
              const currentOps = [];
              if (taskStatus === 'PROCESSING') {
                currentOps.push({
                  title: taskPrompt || 'Active Task Execution',
                  status: 'Running',
                  color: 'text-emerald-700 font-semibold',
                  category: 'Processing',
                });
              } else if (agentResult) {
                const hGate = agentResult.human_gate?.human_gate_status;
                const dStatus = agentResult.delivery?.delivery_status;
                if (hGate === 'PENDING') {
                  currentOps.push({
                    title: taskPrompt || 'Inspection Report → Review Note',
                    status: 'Needs review',
                    color: 'text-amber-800 font-semibold',
                    category: 'Pending',
                  });
                } else if (hGate === 'REJECTED') {
                  currentOps.push({
                    title: taskPrompt || 'Inspection Report → Review Note',
                    status: 'Rejected / Blocked',
                    color: 'text-rose-700 font-bold',
                    category: 'Blocked',
                  });
                } else if (dStatus === 'DELIVERED') {
                  currentOps.push({
                    title: taskPrompt || 'Inspection Report → Deliverable Note',
                    status: 'Completed',
                    color: 'text-emerald-700 font-semibold',
                    category: 'Completed',
                  });
                }
              }

              const filtered = currentOps.filter((op) => op.category === operationFilter);

              if (filtered.length === 0) {
                return (
                  <div className="bg-white/95 rounded-2xl p-6 shadow-sm border border-emerald-100/80 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-700">No active operations in {operationFilter} queue</p>
                    <p className="text-[11px] text-slate-500">
                      Operations reflect real agent runtime state. Initiate tasks from the Command Center to populate this queue.
                    </p>
                  </div>
                );
              }

              return filtered.map((op, idx) => (
                <div
                  key={idx}
                  onClick={() => setScreen('execution')}
                  className="bg-white/95 rounded-2xl px-6 py-4 shadow-sm border border-emerald-100/80 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
                >
                  <span className="text-sm font-bold text-slate-900">{op.title}</span>
                  <span className={`text-xs ${op.color}`}>{op.status}</span>
                </div>
              ));
            })()}
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
            Historical task records are stored on-premise in TASKS_DIR. Multi-task queue listing API is not instrumented on this node.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 22. WEB 22 — CALCULATION WORKSPACE                            */}
      {/* ------------------------------------------------------------- */}
      {screen === 'calculation_workspace' && (
        <div className="w-full max-w-4xl animate-in fade-in duration-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">ENGINEERING</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Calculation workspace</h1>
              <p className="text-slate-600 text-sm mt-1">Perform deterministic and verified engineering calculations.</p>
            </div>
            <button
              onClick={() => setScreen('command_center')}
              aria-label="Back to Command Center"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Left Input Column */}
            <div className="md:col-span-5 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold tracking-wider text-emerald-800 uppercase block mb-1.5">
                    Calculation Prompt
                  </label>
                  <textarea
                    rows={5}
                    value={calcPrompt}
                    onChange={(e) => setCalcPrompt(e.target.value)}
                    placeholder="Enter engineering calculation specification..."
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold tracking-wider text-emerald-800 uppercase block mb-1.5">
                    Optional Parameters
                  </label>
                  <input
                    type="text"
                    value={calcParams}
                    onChange={(e) => setCalcParams(e.target.value)}
                    placeholder="e.g. Pipe length: 500ft, Flow rate: 150 gpm"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={calcLoading || !calcPrompt.trim()}
                onClick={handleRunCalculation}
                className="w-full py-3.5 px-6 rounded-2xl font-semibold text-white text-sm bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-800/20 transition flex items-center justify-center gap-2"
              >
                {calcLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" /> Run Calculation
                  </>
                )}
              </button>
            </div>

            {/* Right Output Panel */}
            <div className="md:col-span-7 bg-white/95 rounded-3xl p-6 shadow-sm border border-emerald-100/80 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100/80">
                <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Step-by-Step Calculation Result
                </span>
                <div className="flex items-center gap-2">
                  {calcRoutedModel && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Model: {calcRoutedModel}
                    </span>
                  )}
                  {calcTier && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      tier {calcTier}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto max-h-[420px]">
                {calcLoading ? (
                  <div className="flex flex-col items-center justify-center h-56 gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                    <span className="text-xs font-semibold">Running sovereign reasoning & calculation...</span>
                  </div>
                ) : calcError ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Calculation failed</p>
                      <p className="mt-1 font-mono text-[11px] break-all">{calcError}</p>
                    </div>
                  </div>
                ) : calcOutput ? (
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {calcOutput}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-56 text-slate-400 text-xs italic">
                    Configure prompt and optional parameters, then click "Run Calculation".
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}