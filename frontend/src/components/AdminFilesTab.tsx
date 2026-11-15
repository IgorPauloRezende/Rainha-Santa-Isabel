import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatDatePt } from '../lib/format';
import { formatFileSize, getFileShortExt, readFileAsBase64 } from '../lib/localFileStore';
import type { ChurchFile, ChurchFolder, FolderArtPreset } from '../types/church';
import GlassFolder, { useIsDarkTheme, type FolderFile } from './GlassFolder';

interface AdminFilesTabProps {
  folders: ChurchFolder[];
  files: ChurchFile[];
  authHeaders: () => Record<string, string>;
  onChanged: () => Promise<void>;
  showToast: (message: string) => void;
}

const ART_PRESETS: Array<{ value: FolderArtPreset; label: string }> = [
  { value: 'verdant', label: 'Esmeralda & Ouro' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'glacier', label: 'Cristal' },
  { value: 'ember', label: 'Âmbar' },
  { value: 'dusk', label: 'Crepúsculo' },
];

export function AdminFilesTab({
  folders,
  files,
  authHeaders,
  onChanged,
  showToast,
}: AdminFilesTabProps) {
  const isDark = useIsDarkTheme();

  // Filters
  const [fileSearch, setFileSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  // New Folder Modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderArt, setFolderArt] = useState<FolderArtPreset>('aurora');
  const [folderPublished, setFolderPublished] = useState(true);
  const [savingFolder, setSavingFolder] = useState(false);

  // New File Modal
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState(folders[0]?.id || '');
  const [uploadMode, setUploadMode] = useState<'upload' | 'note'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileNotes, setFileNotes] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [fileArt, setFileArt] = useState<'' | FolderArtPreset>('');
  const [filePublished, setFilePublished] = useState(true);
  const [savingFile, setSavingFile] = useState(false);

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    return files.filter((file) => {
      const matchesFolder = folderFilter === 'all' || file.folderId === folderFilter;
      const matchesQuery =
        !q ||
        file.name.toLowerCase().includes(q) ||
        file.originalName.toLowerCase().includes(q) ||
        (file.notes && file.notes.toLowerCase().includes(q));
      return matchesFolder && matchesQuery;
    });
  }, [fileSearch, files, folderFilter]);

  function openNewFileModal(folderId?: string) {
    setTargetFolderId(folderId || folders[0]?.id || '');
    setUploadMode('upload');
    setSelectedFile(null);
    setFileName('');
    setFileNotes('');
    setExternalUrl('');
    setFileArt('');
    setFilePublished(true);
    setFileModalOpen(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !fileName.trim()) {
      setFileName(file.name.replace(/\.[^.]+$/, '') || file.name);
    }
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    setSavingFolder(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: folderName.trim(),
          description: folderDesc.trim(),
          art: folderArt,
          published: folderPublished,
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar pasta.');
      setFolderModalOpen(false);
      setFolderName('');
      setFolderDesc('');
      await onChanged();
      showToast('Pasta criada com sucesso.');
    } catch {
      showToast('Erro ao criar pasta.');
    } finally {
      setSavingFolder(false);
    }
  }

  async function handleDeleteFolder(id: string) {
    const res = await fetch(`/api/admin/folders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await onChanged();
      showToast('Pasta removida.');
    }
  }

  async function handleCreateFile(e: FormEvent) {
    e.preventDefault();
    if (!targetFolderId) {
      showToast('Crie ou selecione uma pasta primeiro.');
      return;
    }
    if (uploadMode === 'upload' && !selectedFile) {
      showToast('Selecione um arquivo para enviar.');
      return;
    }
    if (uploadMode === 'note' && !fileNotes.trim() && !externalUrl.trim()) {
      showToast('Informe um texto ou link para salvar.');
      return;
    }

    setSavingFile(true);
    try {
      const contentBase64 =
        uploadMode === 'upload' && selectedFile ? await readFileAsBase64(selectedFile) : '';
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          folderId: targetFolderId,
          name: fileName.trim() || selectedFile?.name || 'Documento',
          originalName: selectedFile?.name || fileName.trim(),
          mimeType: selectedFile?.type || '',
          contentBase64,
          notes: fileNotes,
          externalUrl: uploadMode === 'note' ? externalUrl : '',
          art: fileArt || undefined,
          published: filePublished,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error || 'Erro ao salvar arquivo.');
      }
      setFileModalOpen(false);
      await onChanged();
      showToast('Arquivo salvo na pasta.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar arquivo.');
    } finally {
      setSavingFile(false);
    }
  }

  async function handleToggleFilePublished(file: ChurchFile) {
    const res = await fetch(`/api/admin/files/${encodeURIComponent(file.id)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ published: !file.published }),
    });
    if (res.ok) {
      await onChanged();
      showToast(file.published ? 'Arquivo ocultado do site público.' : 'Arquivo publicado no site.');
    }
  }

  async function handleDeleteFile(id: string) {
    const res = await fetch(`/api/admin/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await onChanged();
      showToast('Arquivo excluído.');
    }
  }

  async function handleDownloadFile(file: ChurchFile) {
    if (file.externalUrl) {
      window.open(file.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const headers = authHeaders();
    delete headers['Content-Type'];
    const res = await fetch(`/api/public/files/${encodeURIComponent(file.id)}/download?download=1`, {
      headers,
    });
    if (!res.ok) {
      showToast('Erro ao baixar arquivo.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName || file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
            Pastas e arquivos
          </h1>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">
            Organize documentos paroquiais em pastas interativas e controle a visibilidade pública.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-black/[0.08] text-[13px] font-medium text-[#1D1D1F] hover:border-black/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-4 h-4 text-[#0066CC]" />
            <span>Nova pasta</span>
          </button>
          <button
            type="button"
            onClick={() => openNewFileModal(folders[0]?.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar arquivo</span>
          </button>
        </div>
      </div>

      {/* Interactive Folder Gallery */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-3 mb-6">
          <h2 className="text-[15px] font-semibold text-[#1D1D1F]">Pastas disponíveis</h2>
          <span className="text-[12px] text-[#6E6E73] tabular-nums">
            {folders.length} pastas · {files.length} arquivos
          </span>
        </div>

        {folders.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-[13px] text-[#6E6E73]">
              Nenhuma pasta criada ainda. Crie a primeira pasta para organizar documentos da paróquia.
            </p>
            <button
              type="button"
              onClick={() => setFolderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-medium hover:bg-black transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Criar primeira pasta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
            {folders.map((folder, idx) => {
              const folderFiles = files.filter((f) => f.folderId === folder.id);
              const sheets: FolderFile[] = folderFiles.map((f) => {
                const ext = getFileShortExt(f.originalName, f.mimeType, f.externalUrl);
                const sizeLabel = formatFileSize(f.size);
                return {
                  id: f.id,
                  name: f.name,
                  meta: sizeLabel ? `${ext} · ${sizeLabel}` : ext,
                  art: f.art,
                };
              });
              return (
                <div key={folder.id} className="flex flex-col items-center text-center">
                  <GlassFolder
                    label={folder.name}
                    tone={isDark ? 'dark' : 'light'}
                    art={folder.art}
                    seed={folder.seed}
                    files={sheets}
                    action="add"
                    width={252}
                    appearDelay={idx * 40}
                    onActionClick={() => openNewFileModal(folder.id)}
                    onFileSelect={(_sheet, index) => {
                      const target = folderFiles[index];
                      if (target) handleDownloadFile(target);
                    }}
                  />
                  <div className="mt-3 flex items-center gap-2.5 text-[12px] text-[#6E6E73] tabular-nums">
                    <span className={folder.published ? 'text-[#218838] font-medium' : ''}>
                      {folder.published ? 'Pública no site' : 'Oculta'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{folderFiles.length} itens</span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File Management Table */}
      <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
              Arquivos salvos ({filteredFiles.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Buscar arquivo..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F5F5F7] text-[12px] text-[#1D1D1F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
              />
            </div>

            <select
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              aria-label="Filtrar por pasta"
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] text-[12px] font-medium text-[#1D1D1F]"
            >
              <option value="all">Todas as pastas</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="py-10 px-6 text-center space-y-2.5">
            <p className="text-[13px] text-[#6E6E73]">
              {files.length === 0
                ? 'Nenhum arquivo salvo ainda. Adicione documentos clicando no "+" de uma pasta ou em "Salvar arquivo".'
                : 'Nenhum arquivo encontrado com os filtros aplicados.'}
            </p>
            {files.length === 0 && folders.length > 0 && (
              <button
                type="button"
                onClick={() => openNewFileModal(folders[0]?.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#218838] text-white text-[12px] font-medium hover:bg-[#196C2E] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Salvar primeiro arquivo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                  <th className="py-2.5 px-6">Documento</th>
                  <th className="py-2.5 px-4">Pasta</th>
                  <th className="py-2.5 px-4">Formato &amp; Tamanho</th>
                  <th className="py-2.5 px-4">Data</th>
                  <th className="py-2.5 px-4">Visibilidade</th>
                  <th className="py-2.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[13px]">
                {filteredFiles.map((file) => {
                  const folder = folders.find((f) => f.id === file.folderId);
                  const ext = getFileShortExt(file.originalName, file.mimeType, file.externalUrl);
                  const sizeLabel = formatFileSize(file.size);
                  return (
                    <tr key={file.id} className="hover:bg-[#F5F5F7]/70 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-[#6E6E73] shrink-0" />
                          <span className="font-medium text-[#1D1D1F] truncate">{file.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#424245] whitespace-nowrap">
                        {folder?.name || 'Sem pasta'}
                      </td>
                      <td className="py-3 px-4 text-[#6E6E73] tabular-nums whitespace-nowrap">
                        {sizeLabel ? `${ext} · ${sizeLabel}` : ext}
                      </td>
                      <td className="py-3 px-4 text-[#6E6E73] tabular-nums whitespace-nowrap">
                        {formatDatePt(file.createdAt.slice(0, 10))}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleFilePublished(file)}
                          className={`inline-flex items-center gap-1.5 text-[12px] font-medium cursor-pointer hover:underline ${
                            file.published ? 'text-[#218838]' : 'text-[#6E6E73]'
                          }`}
                        >
                          {file.published ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Público</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            aria-label={`Baixar ${file.name}`}
                            title={file.externalUrl ? 'Abrir link' : 'Baixar arquivo'}
                            className="p-1.5 rounded-lg hover:bg-black/[0.06] text-[#424245] transition-colors cursor-pointer"
                          >
                            {file.externalUrl ? (
                              <ExternalLink className="w-4 h-4" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            aria-label={`Excluir ${file.name}`}
                            title="Excluir arquivo"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nova Pasta */}
      {folderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFolderModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-black/[0.08] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#1D1D1F]">Nova pasta</h3>
              <button
                type="button"
                onClick={() => setFolderModalOpen(false)}
                aria-label="Fechar"
                className="h-8 w-8 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Nome da pasta
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ex: Escala de Leitores"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Descrição curta
                </label>
                <input
                  type="text"
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Ex: Escalas mensais da Pastoral da Liturgia"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Arte da pasta
                </label>
                <select
                  value={folderArt}
                  onChange={(e) => setFolderArt(e.target.value as FolderArtPreset)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px]"
                >
                  {ART_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#424245] cursor-pointer">
                <input
                  type="checkbox"
                  checked={folderPublished}
                  onChange={(e) => setFolderPublished(e.target.checked)}
                />
                <span>Visível no site público</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 text-[13px] font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="px-5 py-2 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[13px] font-medium cursor-pointer transition-colors"
                >
                  {savingFolder ? 'Criando...' : 'Criar pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Salvar Arquivo */}
      {fileModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFileModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-black/[0.08] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[#1D1D1F]">Salvar arquivo na pasta</h3>
              <button
                type="button"
                onClick={() => setFileModalOpen(false)}
                aria-label="Fechar"
                className="h-8 w-8 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">Pasta</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px]"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EBEBF0]">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                    uploadMode === 'upload'
                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Enviar arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('note')}
                  className={`py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                    uploadMode === 'note'
                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Texto ou link
                </button>
              </div>

              {uploadMode === 'upload' ? (
                <label className="block rounded-xl border-2 border-dashed border-black/[0.12] bg-[#F5F5F7] p-5 text-center cursor-pointer hover:border-[#218838] transition-colors">
                  <input type="file" onChange={handleFileChange} className="sr-only" />
                  <Upload className="w-5 h-5 text-[#0066CC] mx-auto mb-1.5" />
                  <p className="text-[13px] font-medium text-[#1D1D1F]">
                    {selectedFile ? selectedFile.name : 'Escolher arquivo do computador'}
                  </p>
                  <p className="text-[12px] text-[#6E6E73] mt-0.5 tabular-nums">
                    {selectedFile ? formatFileSize(selectedFile.size) : 'Até 15 MB'}
                  </p>
                </label>
              ) : (
                <div className="space-y-2.5">
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="Link externo (opcional)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                  />
                  <textarea
                    rows={3}
                    value={fileNotes}
                    onChange={(e) => setFileNotes(e.target.value)}
                    placeholder="Conteúdo de texto ou observações..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px] resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Nome do arquivo
                  </label>
                  <input
                    type="text"
                    required
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Ex: Folheto Missa Dominical"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Visual da folha
                  </label>
                  <select
                    value={fileArt}
                    onChange={(e) => setFileArt(e.target.value as '' | FolderArtPreset)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] text-[13px]"
                  >
                    <option value="">Folha de papel</option>
                    {ART_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[13px] text-[#424245] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filePublished}
                  onChange={(e) => setFilePublished(e.target.checked)}
                />
                <span>Publicar no site público</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 text-[13px] font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFile}
                  className="px-5 py-2 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[13px] font-medium cursor-pointer transition-colors"
                >
                  {savingFile ? 'Salvando...' : 'Salvar arquivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
