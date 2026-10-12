import React, { useState } from 'react';
import { Terminal, Bell, Cpu, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface ClusterNode {
  id: string;
  partition: 'batch' | 'gpu' | 'debug';
  coresUsed: number;
  coresTotal: number;
  status: 'alloc' | 'idle' | 'mix';
  activeJob: string;
}

const NODES: ClusterNode[] = [
  { id: 'node-01', partition: 'batch', coresUsed: 64, coresTotal: 64, status: 'alloc', activeJob: 'vasp_hse06_allotrope' },
  { id: 'node-02', partition: 'batch', coresUsed: 52, coresTotal: 64, status: 'mix', activeJob: 'siesta_polymer_chain' },
  { id: 'node-03', partition: 'gpu', coresUsed: 32, coresTotal: 32, status: 'alloc', activeJob: 'aird2d_gnn_train' },
  { id: 'node-04', partition: 'debug', coresUsed: 8, coresTotal: 32, status: 'mix', activeJob: 'test_kpoints_bader' },
];

export function SlurmClusterTelemetry() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'batch' | 'gpu'>('all');
  const [notificationSent, setNotificationSent] = useState(false);

  const filteredNodes = activeFilter === 'all' ? NODES : NODES.filter((n) => n.partition === activeFilter);

  const triggerMockAlert = () => {
    setNotificationSent(true);
    setTimeout(() => setNotificationSent(false), 3000);
  };

  return (
    <div className="rounded-lg border border-forest-800/15 bg-white p-5 shadow-editorial">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-forest-800/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-forest-700" />
          <h4 className="text-sm font-serif font-bold text-forest-900">
            HPC Slurm Daemon & Discord Telemetry
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-800/15">
          server-notification daemon
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Node Telemetry Partition Matrix */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-ink-600">Active Node Partitions</span>
              <div className="flex gap-1">
                {(['all', 'batch', 'gpu'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      activeFilter === filter
                        ? 'bg-forest-800 text-white'
                        : 'bg-ivory-100 text-ink-600 hover:bg-forest-100'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Nodes List */}
            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const utilPercent = (node.coresUsed / node.coresTotal) * 100;
                return (
                  <div key={node.id} className="p-2.5 rounded bg-ivory-50 border border-forest-800/10 text-xs font-mono">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-forest-950">{node.id}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-forest-200/60 text-forest-800">
                          {node.partition}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-600">
                        {node.coresUsed} / {node.coresTotal} Cores ({utilPercent.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-ivory-200 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${
                          utilPercent > 90 ? 'bg-forest-700' : 'bg-forest-500'
                        }`}
                        style={{ width: `${utilPercent}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-ink-500 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">Job: {node.activeJob}</span>
                      <span className="text-forest-700 font-medium">State: RUNNING</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-forest-800/10 text-[10.5px] font-mono text-ink-500 flex items-center justify-between">
            <span>Clusters Monitored: Iskay · Huk · Carbono · Arch</span>
            <span className="text-forest-800 font-semibold">Strict Completion Anchors</span>
          </div>
        </div>

        {/* Discord Bot Notification Simulation */}
        <div className="md:col-span-5 bg-forest-950 p-4 rounded text-xs font-mono text-ivory-50 flex flex-col justify-between border border-forest-900">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-forest-800/60">
              <span className="flex items-center gap-1.5 text-forest-300 font-semibold">
                <Bell className="w-3.5 h-3.5" />
                <span>Discord Telemetry Webhook</span>
              </span>
              <button
                onClick={triggerMockAlert}
                className="text-[10px] bg-forest-800 hover:bg-forest-700 text-forest-100 px-2 py-0.5 rounded transition-colors"
              >
                Simulate Alert
              </button>
            </div>

            {/* Simulated Discord Message */}
            <div className="p-3 rounded bg-forest-900/90 border-l-4 border-forest-400 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-forest-400" />
                  <span>[SLURM] Job COMPLETED</span>
                </span>
                <span className="text-[9px] text-forest-400">Just now</span>
              </div>
              <div className="text-[10.5px] text-forest-200">
                <strong>Job:</strong> <code className="text-terracotta-300">vasp_hse06_allotrope</code><br />
                <strong>Node:</strong> node-01 (64 cores)<br />
                <strong>Walltime:</strong> 04h 12m 45s<br />
                <strong>Status:</strong> Strict "End of run" confirmed. Zero SCF sloshing.
              </div>
            </div>

            {notificationSent && (
              <div className="mt-2 text-[10px] text-forest-300 animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Webhook ping dispatched to #hpc-research!</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-forest-800/60 text-[10px] text-forest-400 leading-tight">
            Protected against false-positive string grepping. Only fires on strict completion anchors.
          </div>
        </div>

      </div>
    </div>
  );
}
