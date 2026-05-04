import React from 'react';
import { useUpdatesStore } from '../../store/updatesStore';
import { X, Sparkles, Github, ExternalLink } from 'lucide-react';

export const UpdatesModal: React.FC = () => {
  const { commits, isModalOpen, closeModal } = useUpdatesStore();

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-card-dark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-dts-primary dark:bg-dts-primary-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dts-secondary/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-dts-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">¡Nuevas Actualizaciones!</h2>
              <p className="text-xs text-gray-300">Descubre qué hay de nuevo en dTS Instruments</p>
            </div>
          </div>
          <button 
            onClick={closeModal}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-white dark:bg-surface-dark">
          <div className="space-y-4">
            {commits.map((commit, index) => {
              const isNew = index === 0; // Highlight the latest commit
              const date = new Date(commit.commit.author.date).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              
              return (
                <div key={commit.sha} className={`relative pl-6 pb-6 border-l-2 last:border-l-0 last:pb-0 ${isNew ? 'border-dts-secondary' : 'border-gray-200 dark:border-white/10'}`}>
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-surface-dark ${isNew ? 'bg-dts-secondary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">{date}</span>
                    <a href={commit.html_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-dts-secondary transition-colors" title="Ver en GitHub">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {commit.commit.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Github className="w-3.5 h-3.5" />
                    <span>{commit.commit.author.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-surface-card-dark border-t border-gray-100 dark:border-white/10 flex justify-end">
          <button 
            onClick={closeModal}
            className="px-6 py-2 bg-dts-secondary hover:bg-dts-secondary-dark text-white text-sm font-bold rounded-lg transition-colors shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
