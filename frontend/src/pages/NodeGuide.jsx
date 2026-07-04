import React, { useState } from 'react';
import {
  HelpCircle,
  Code,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  Info,
  CheckCircle,
  Database,
  GitPullRequest,
  RefreshCw,
  Play
} from 'lucide-react';

const NODE_TYPES_DOCS = [
  {
    id: 'validator',
    name: 'Schema Validator',
    icon: CheckCircle,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    description: 'Acts as the gatekeeper of your API by validating incoming payloads using a JSON Schema (AJV-based).',
    howItWorks: 'You define a JSON Schema and set the Input Path (usually request.body). The node evaluates the input. If it doesn\'t match the schema, it fails the workflow immediately (STOP strategy), preventing unvalidated data from running downstream.',
    howToConnect: 'Place this as the very first node immediately after the API starts. If validation succeeds, route to your downstream processing nodes.',
    configExample: `{
  "schema": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "format": "email" },
      "age": { "type": "number" }
    },
    "required": ["email"]
  },
  "inputPath": "request.body"
}`
  },
  {
    id: 'http',
    name: 'HTTP Request',
    icon: Play,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    description: 'Integrates external services by calling downstream REST APIs.',
    howItWorks: 'Sends GET, POST, PUT, PATCH, or DELETE requests to a specified endpoint. You can dynamically inject data into the URL, headers, query params, or body using handlebars notation (e.g., {{request.body.id}}).',
    howToConnect: 'Connect this node after validation. Its output is captured in the outputs system under the node\'s unique ID and can be used in downstream nodes.',
    configExample: `{
  "url": "https://api.example.com/users/{{request.body.userId}}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{request.headers.auth}}"
  }
}`
  },
  {
    id: 'transform',
    name: 'Transform Mapping',
    icon: GitPullRequest,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    description: 'Maps, restructures, and cleans data payloads using JSONPath expressions.',
    howItWorks: 'Takes values from a source (like $.request.body.user.profileName) and maps them to new, simplified target keys. This is ideal for cleaning up dirty datasets before passing them to another node.',
    howToConnect: 'Usually placed between an API Request node and an AI Agent, or between two different external API integrations to translate data schemas.',
    configExample: `{
  "mappings": [
    { "from": "$.request.body.user_details.email", "to": "email" },
    { "from": "$.outputs.http_1.data.score", "to": "userScore" }
  ]
}`
  },
  {
    id: 'condition',
    name: 'Condition Branch',
    icon: ArrowRight,
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    description: 'Directs the API execution path dynamically using conditional logic.',
    howItWorks: 'Evaluates a boolean condition using JSONLogic. Depending on whether the result is True or False, the engine follows the corresponding path connected to the targets.',
    howToConnect: 'Connect one input path to it, and draw two outgoing edges. In the sidebar, specify which node to run for a successful (true) or failed (false) condition.',
    configExample: `{
  "expression": {
    "and": [
      { ">": [ { "var": "request.body.amount" }, 500000 ] }
    ]
  },
  "trueTarget": "risk_assessment_ai",
  "falseTarget": "auto_approve_node"
}`
  },
  {
    id: 'parallel',
    name: 'Parallel Group',
    icon: Layers,
    color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    description: 'Fans out and runs multiple tasks concurrently using background queues.',
    howItWorks: 'Dispatches designated jobs to BullMQ queues. Instead of executing sequentially and stacking latency, the parallel node fires all target nodes simultaneously.',
    howToConnect: 'Place this node before a set of tasks that do not depend on each other (e.g. fetching credit scores from 3 different agencies). Combine their results afterward using a Merge node.',
    configExample: `{
  "nodeIds": ["http_fetch_scores", "http_fetch_history"],
  "waitForAll": true
}`
  },
  {
    id: 'merge',
    name: 'Merge Output',
    icon: GitPullRequest,
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    description: 'Aggregates multiple parallel execution results back into a single datasets.',
    howItWorks: 'Combines outputs using strategy rules: FIRST_SUCCESS (takes the first succeeding node), ALL (returns an array of all node outputs), or MERGE_OBJECTS (unions key-value objects).',
    howToConnect: 'Connect the output edges of all your parallel paths into this Merge node. The combined output is then forwarded down the single mainline path.',
    configExample: `{
  "sourceNodeIds": ["http_fetch_scores", "http_fetch_history"],
  "strategy": "MERGE_OBJECTS"
}`
  },
  {
    id: 'retry',
    name: 'Retry Wrapper',
    icon: RefreshCw,
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    description: 'Protects critical paths by automatically retrying transient errors.',
    howItWorks: 'Wraps around any fragile node (like an unreliable third-party API) and intercepts failures. It executes retries with configurable delay rules and backoff types (fixed or exponential).',
    howToConnect: 'Simply drag the Retry Wrapper onto the canvas, open its settings, and target the specific node you want it to supervise.',
    configExample: `{
  "targetNodeId": "http_3rd_party_api",
  "maxAttempts": 3,
  "delay": 2000,
  "backoffType": "exponential"
}`
  },
  {
    id: 'cache',
    name: 'Cache Check & Write',
    icon: Database,
    color: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
    description: 'Boosts API performance by saving data to a Redis and In-Memory cache layer.',
    howItWorks: 'Cache Check searches for a resolved template key. If found, it outputs cacheHit: true and outputs the data. Cache Write saves the designated output of a source node to Redis using a specific TTL.',
    howToConnect: 'Place Cache Check at the start of your workflow. Route a Cache Hit straight to your response mapper. Route a Cache Miss to your database/API nodes, followed by a Cache Write, and then to your mapper.',
    configExample: `{
  "keyTemplate": "user:{{request.body.email}}:profile",
  "ttl": 3600,
  "sourceNodeId": "http_fetch_profile"
}`
  },
  {
    id: 'ai',
    name: 'Gemini AI Agent',
    icon: Sparkles,
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    description: 'Integrates artificial intelligence and LLM logic directly inside your API.',
    howItWorks: 'Sends structured prompt templates to Google Gemini. You can interpolate variables from prior nodes. The AI output is constrained to a specific JSON schema that you define to guarantee valid JSON formatting.',
    howToConnect: 'Place it anywhere in your workflow where intelligent analysis, classification, summary, or reasoning is required.',
    configExample: `{
  "promptTemplate": "Decide if this user comment is positive or negative: {{request.body.comment}}",
  "outputSchema": {
    "type": "object",
    "properties": {
      "sentiment": { "type": "string" }
    }
  }
}`
  },
  {
    id: 'response',
    name: 'Response Mapper',
    icon: Code,
    color: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20',
    description: 'Shapes the final JSON response returned to the API caller.',
    howItWorks: 'Uses template string interpolation to construct a key-value object pulling parameters from any prior node (using outputs.node_id syntax) or raw request details.',
    howToConnect: 'Connect this node towards the end of your workflow, immediately before the Return Response node.',
    configExample: `{
  "template": {
    "success": true,
    "userEmail": "{{request.body.email}}",
    "result": "{{outputs.ai_agent_1.data}}"
  }
}`
  },
  {
    id: 'return',
    name: 'Return Response',
    icon: ArrowRight,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    description: 'Terminates workflow execution and returns the HTTP status code and response payload.',
    howItWorks: 'Specifies which node\'s output to return to the client. You can also configure the final HTTP Status Code (such as 200, 201, 400).',
    howToConnect: 'Connect this as the very last node in your workflow tree.',
    configExample: `{
  "sourceNodeId": "response_mapper_1",
  "statusCode": 200
}`
  }
];

export default function NodeGuide() {
  const [activeTab, setActiveTab] = useState(NODE_TYPES_DOCS[0].id);
  const activeNode = NODE_TYPES_DOCS.find(n => n.id === activeTab);
  const ActiveIcon = activeNode.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
          <BookOpen className="text-brand-400" size={28} />
          <span>Node Configuration Guide</span>
        </h1>
        <p className="text-slate-400 mt-1">
          Learn how Orchest AI components work, how to connect them, and see example JSON configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Sidebar selector */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
          {NODE_TYPES_DOCS.map((node) => {
            const Icon = node.icon;
            return (
              <button
                key={node.id}
                onClick={() => setActiveTab(node.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  activeTab === node.id
                    ? 'bg-slate-900 border-brand-500/50 shadow-glow-brand text-slate-100'
                    : 'bg-[#090d16]/40 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                }`}
              >
                <div className={`p-1.5 rounded-lg border ${node.color} shrink-0`}>
                  <Icon size={16} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold">{node.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4 border-b border-slate-900 pb-5">
              <div className={`p-3 rounded-xl border ${activeNode.color}`}>
                <ActiveIcon size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">{activeNode.name}</h2>
                <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider font-mono">Node Type</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Info size={13} />
                <span>What it is</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {activeNode.description}
              </p>
            </div>

            {/* How it works */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers size={13} />
                <span>How it works</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {activeNode.howItWorks}
              </p>
            </div>

            {/* How to connect */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ArrowRight size={13} />
                <span>How to connect & map</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {activeNode.howToConnect}
              </p>
            </div>

            {/* Code / Configuration Example */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Code size={13} />
                <span>Input Config Example</span>
              </h3>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-60">
                {activeNode.configExample}
              </pre>
            </div>
          </div>

          {/* Quick connection tip */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-blue-400 flex items-start space-x-3 text-xs leading-relaxed">
            <HelpCircle className="shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-bold">Dynamic Node Referencing Tip: </span>
              In response templates or prompt boxes, you can access values from any completed node using the template syntax: 
              <code className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 mx-1 font-mono text-emerald-400">
                {"{{outputs.YOUR_NODE_ID.data.your_key}}"}
              </code>.
              Make sure you copy the exact Node ID shown at the top of the configure panel!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
