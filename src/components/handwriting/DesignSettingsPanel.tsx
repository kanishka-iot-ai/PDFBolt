import React from 'react';
import {
  FileText, Download, Sliders, Type, AlignLeft, AlignCenter,
  AlignJustify, Layers, CheckCircle2, Sparkles, FileDown
} from 'lucide-react';
import {
  PDFDesignSettings,
  PaperSize,
  MarginType,
  FontFamily,
  TextAlignment
} from '../../types/handwriting';

interface DesignSettingsPanelProps {
  settings: PDFDesignSettings;
  onChange: (updated: PDFDesignSettings) => void;
  onDownloadPDF: () => void;
  onDownloadDOCX: () => void;
  onDownloadTXT: () => void;
  isGenerating: boolean;
  darkMode: boolean;
}

const DesignSettingsPanel: React.FC<DesignSettingsPanelProps> = ({
  settings,
  onChange,
  onDownloadPDF,
  onDownloadDOCX,
  onDownloadTXT,
  isGenerating,
  darkMode
}) => {
  const updateSetting = <K extends keyof PDFDesignSettings>(key: K, value: PDFDesignSettings[K]) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className={`p-6 md:p-8 rounded-[2.5rem] border shadow-xl space-y-8 ${
      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-500">
            <Sliders size={22} />
          </div>
          <div>
            <h3 className="font-black text-xl">Document Design & Export</h3>
            <p className="text-xs text-slate-400 font-medium">
              Customize typography and layout for computer-typed documents
            </p>
          </div>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* Document Title */}
        <div className="col-span-full">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Document Title
          </label>
          <input
            type="text"
            value={settings.documentTitle}
            onChange={(e) => updateSetting('documentTitle', e.target.value)}
            placeholder="e.g. Handwritten Meeting Notes"
            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-500 transition-all ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* Paper Size */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Paper Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['A4', 'Letter', 'A5'] as PaperSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateSetting('paperSize', size)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  settings.paperSize === size
                    ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                    : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Margins */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Margins
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['narrow', 'normal', 'wide'] as MarginType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateSetting('margin', m)}
                className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  settings.margin === m
                    ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                    : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Font Family
          </label>
          <select
            value={settings.font}
            onChange={(e) => updateSetting('font', e.target.value as FontFamily)}
            className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <option value="Inter">Inter (Clean Modern Sans)</option>
            <option value="Arial">Arial (Standard Sans)</option>
            <option value="Times New Roman">Times New Roman (Serif)</option>
            <option value="Georgia">Georgia (Editorial Serif)</option>
            <option value="Courier">Courier (Monospace)</option>
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Font Size ({settings.fontSize}pt)
          </label>
          <div className="flex gap-1.5">
            {[10, 11, 12, 14, 16].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => updateSetting('fontSize', sz as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  settings.fontSize === sz
                    ? 'bg-yellow-500 text-slate-950 font-black'
                    : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Line Spacing */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Line Spacing ({settings.lineSpacing}x)
          </label>
          <div className="flex gap-1.5">
            {[1.0, 1.15, 1.5, 2.0].map((ls) => (
              <button
                key={ls}
                type="button"
                onClick={() => updateSetting('lineSpacing', ls as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  settings.lineSpacing === ls
                    ? 'bg-yellow-500 text-slate-950 font-black'
                    : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ls}
              </button>
            ))}
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Alignment
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateSetting('alignment', 'left')}
              className={`py-2.5 rounded-xl flex items-center justify-center transition-all ${
                settings.alignment === 'left'
                  ? 'bg-yellow-500 text-slate-950 font-black'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-600'
              }`}
              title="Left Align"
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => updateSetting('alignment', 'center')}
              className={`py-2.5 rounded-xl flex items-center justify-center transition-all ${
                settings.alignment === 'center'
                  ? 'bg-yellow-500 text-slate-950 font-black'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-600'
              }`}
              title="Center Align"
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => updateSetting('alignment', 'justify')}
              className={`py-2.5 rounded-xl flex items-center justify-center transition-all ${
                settings.alignment === 'justify'
                  ? 'bg-yellow-500 text-slate-950 font-black'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-600'
              }`}
              title="Justify Align"
            >
              <AlignJustify size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Header, Footer & Page Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">
            Running Header (Optional)
          </label>
          <input
            type="text"
            value={settings.headerText || ''}
            onChange={(e) => updateSetting('headerText', e.target.value)}
            placeholder="e.g. Confidential Project Notes"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">
            Running Footer (Optional)
          </label>
          <input
            type="text"
            value={settings.footerText || ''}
            onChange={(e) => updateSetting('footerText', e.target.value)}
            placeholder="e.g. Transcribed via PDFBolt"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Export Buttons */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includePageNumbers}
              onChange={(e) => updateSetting('includePageNumbers', e.target.checked)}
              className="rounded accent-yellow-500 w-4 h-4"
            />
            Include Page Numbers ("Page X of Y")
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onDownloadTXT}
            disabled={isGenerating}
            className={`px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center gap-2 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText size={16} /> Download TXT
          </button>

          <button
            onClick={onDownloadDOCX}
            disabled={isGenerating}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center gap-2 ${
              darkMode
                ? 'bg-blue-900/30 border-blue-800 text-blue-400 hover:bg-blue-900/50'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <FileDown size={16} /> Download DOCX
          </button>

          <button
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Download size={18} /> {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignSettingsPanel;
