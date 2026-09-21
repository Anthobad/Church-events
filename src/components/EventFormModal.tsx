import React, { useState, useRef } from 'react';
import { ChurchEvent, SeatingBlueprint, Language, EventType } from '../types';
import { translations } from '../services/i18n';
import { BlueprintCanvas } from './BlueprintCanvas';
import { uploadEventImage, MAX_IMAGE_FILE_SIZE } from '../services/storage';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  LayoutGrid,
  KeyRound,
  CheckCircle2,
  UploadCloud,
  ImageIcon,
  Loader2,
  AlertCircle,
  Database,
  RotateCcw
} from 'lucide-react';

interface EventFormModalProps {
  initialEvent?: ChurchEvent | null;
  language: Language;
  onClose: () => void;
  onSave: (event: ChurchEvent) => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  initialEvent,
  language,
  onClose,
  onSave
}) => {
  const t = translations[language];
  const isEditing = Boolean(initialEvent);

  // Form Fields
  const [showImageUploader, setShowImageUploader] = useState(Boolean(initialEvent?.imageUrl));
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSupabaseStored, setIsSupabaseStored] = useState(
    Boolean(initialEvent?.imageUrl && initialEvent.imageUrl.includes('supabase.co/storage'))
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [date, setDate] = useState(initialEvent?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialEvent?.time || '18:00');
  const [location, setLocation] = useState(initialEvent?.location || t.defaultLocation);
  const [type, setType] = useState<EventType>(initialEvent?.type || 'registration_required');
  const [isPaid, setIsPaid] = useState(Boolean(initialEvent?.isPaid));

  // Blueprint Section State: Perimeter is not given by default - drawn by admin
  const defaultBlueprint: SeatingBlueprint = {
    width: 720,
    height: 480,
    perimeterPoints: undefined,
    elements: []
  };

  const [showBlueprint, setShowBlueprint] = useState(
    Boolean(
      initialEvent?.blueprint &&
        (initialEvent.blueprint.elements.length > 0 ||
          (initialEvent.blueprint.perimeterPoints && initialEvent.blueprint.perimeterPoints.length >= 3))
    )
  );
  const [blueprint, setBlueprint] = useState<SeatingBlueprint>(initialEvent?.blueprint || defaultBlueprint);

  // Sample church event images for quick selection
  const sampleImages = [
    { label: t.sampleImageRecital, url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80' },
    { label: t.sampleImageDinner, url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80' },
    { label: t.sampleImageRetreat, url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80' },
    { label: t.sampleImageFestival, url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80' }
  ];

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setUploadError(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setUploadError(t.invalidImageTypeError);
      return;
    }

    // Validate 5MB limit
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setUploadError(t.fileSizeExceededError);
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadEventImage(file);
      setImageUrl(result.url);
      setIsSupabaseStored(result.isSupabase);
      setUploadedFileName(result.fileName);
      setUploadedFileSize(result.fileSize);
    } catch (err: any) {
      if (err?.message === 'FILE_SIZE_EXCEEDED') {
        setUploadError(t.fileSizeExceededError);
      } else if (err?.message === 'INVALID_IMAGE_TYPE') {
        setUploadError(t.invalidImageTypeError);
      } else {
        setUploadError(t.fileSizeExceededError);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileProcess(file);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      return;
    }

    const isFreeForAll = type === 'open';

    const eventToSave: ChurchEvent = {
      id: initialEvent?.id || `event-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
      date,
      time,
      location: location.trim(),
      type,
      isPaid: isFreeForAll ? false : isPaid,
      views: initialEvent?.views || 0,
      likes: initialEvent?.likes || 0,
      blueprint:
        !isFreeForAll &&
        showBlueprint &&
        (blueprint.elements.length > 0 ||
          (blueprint.perimeterPoints && blueprint.perimeterPoints.length >= 3))
          ? blueprint
          : undefined,
      createdAt: initialEvent?.createdAt || new Date().toISOString()
    };

    onSave(eventToSave);
  };

  return (
    <div
      id="event-form-modal-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="event-form-modal-card"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-stone-200 flex items-center justify-between gap-3 min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 truncate min-w-0">
            <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="truncate">{isEditing ? t.editEvent : t.addEvent}</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label={t.cancelBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* 1. UPLOAD AN IMAGE & "+" BELOW IT */}
          <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-700" />
                  <span>{t.uploadImage}</span>
                </label>
                <p className="text-xs text-stone-500">{t.maxFileSizeNotice}</p>
              </div>

              {showImageUploader && (
                <button
                  type="button"
                  onClick={() => {
                    setShowImageUploader(false);
                    setImageUrl('');
                    setUploadedFileName('');
                    setUploadedFileSize(null);
                    setUploadError(null);
                  }}
                  className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.removeImage}</span>
                </button>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Error Message if file too large or invalid */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {!showImageUploader ? (
              /* Original "+" Button Layout */
              <button
                id="add-image-placeholder-btn"
                type="button"
                onClick={() => {
                  setShowImageUploader(true);
                  fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full py-4 border-2 border-dashed rounded-xl bg-white/80 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isDragging
                    ? 'border-amber-600 bg-amber-50/80 scale-[1.01]'
                    : 'border-stone-300 hover:border-amber-600 hover:bg-amber-50/50 text-stone-600 hover:text-amber-800'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">{t.addImagePlaceholder}</span>
              </button>
            ) : isUploading ? (
              /* Uploading State */
              <div className="w-full py-8 border-2 border-dashed border-amber-400 bg-amber-50/50 rounded-2xl flex flex-col items-center justify-center gap-2.5">
                <Loader2 className="w-7 h-7 text-amber-700 animate-spin" />
                <span className="text-xs sm:text-sm font-semibold text-amber-900">
                  {t.uploadingImage}
                </span>
                <span className="text-[11px] text-amber-700/80">
                  {t.maxFileSizeNotice}
                </span>
              </div>
            ) : !imageUrl ? (
              /* Drag & Drop Upload Zone (Supports both Drag & Drop and Click) */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-6 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-600 bg-amber-50/80 scale-[1.01]'
                    : 'border-stone-300 hover:border-amber-600 bg-white/90 hover:bg-amber-50/30'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-2 shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm text-stone-700 font-medium">
                  <span>{t.dragAndDropImage} </span>
                  <span className="text-amber-700 font-bold underline underline-offset-2">
                    {t.browseFiles}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  {t.maxFileSizeNotice}
                </p>

                {/* Quick preset banners */}
                <div
                  className="mt-4 pt-3 border-t border-stone-200/80 w-full flex flex-wrap items-center justify-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] font-medium text-stone-500 me-1">
                    {t.orChooseSample}
                  </span>
                  {sampleImages.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageUrl(s.url);
                        setIsSupabaseStored(false);
                        setUploadedFileName(s.label);
                        setUploadedFileSize(null);
                        setUploadError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 transition-colors cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Image Preview Card with Supabase Bucket Status */
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                  <img
                    src={imageUrl}
                    alt="Event Image Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 end-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-xs shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.changeImage}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-stone-500 shrink-0" />
                    <span className="text-xs font-bold text-stone-800 truncate max-w-[200px] sm:max-w-xs">
                      {uploadedFileName || t.uploadImage}
                    </span>
                    {uploadedFileSize && (
                      <span className="text-[11px] text-stone-500">
                        ({formatFileSize(uploadedFileSize)})
                      </span>
                    )}
                  </div>

                  {isSupabaseStored ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                      <Database className="w-3 h-3 text-emerald-700" />
                      <span>{t.uploadedToSupabase}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-amber-700" />
                      <span>{t.imageReady}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. TITLE & DESCRIPTION (MANDATORY) */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                {t.title} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm sm:text-base font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                {t.description} <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm text-stone-800 bg-white leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Date, Time, Location & Event Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>{t.date}</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{t.time}</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{t.location}</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t.locationPlaceholder}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Event Type (Open for All vs Registration Required) */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-0.5">
                {t.eventType}
              </label>
              <span className="text-xs text-stone-500">
                {t.eventTypeDesc}
              </span>
            </div>

            <div className="flex flex-wrap sm:inline-flex rounded-xl p-1 bg-stone-200 border border-stone-300 text-xs font-bold shrink-0 gap-1">
              <button
                type="button"
                onClick={() => {
                  setType('open');
                  setIsPaid(false);
                  setShowBlueprint(false);
                }}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                  type === 'open'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.openForAll}
              </button>
              <button
                type="button"
                onClick={() => setType('registration_required')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                  type === 'registration_required'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.registrationRequired}
              </button>
            </div>
          </div>

          {/* Free for all event notice */}
          {type === 'open' && (
            <div className="bg-emerald-50/80 p-4 sm:p-5 rounded-2xl border border-emerald-200 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {t.openEventFreeNoticeTitle}
                </h3>
                <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                  {t.openEventFreeNoticeDesc}
                </p>
              </div>
            </div>
          )}

          {/* Blueprint and Paid Switch only available when registration is required */}
          {type === 'registration_required' && (
            <>
              {/* 3. BLUEPRINT FOR SEATING AREA IF NEEDED WITH "+" BUTTON */}
              <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-amber-700" />
                      <span>{t.blueprintTitle}</span>
                    </label>
                    <p className="text-xs text-stone-500">{t.blueprintDesc}</p>
                  </div>

                  {showBlueprint && (
                    <button
                      type="button"
                      onClick={() => setShowBlueprint(false)}
                      className="text-xs text-stone-500 hover:text-red-600 cursor-pointer"
                    >
                      {t.hideBlueprint}
                    </button>
                  )}
                </div>

                {!showBlueprint ? (
                  <button
                    id="add-blueprint-btn"
                    type="button"
                    onClick={() => setShowBlueprint(true)}
                    className="w-full py-4 border-2 border-dashed border-stone-300 hover:border-amber-600 rounded-xl bg-white/80 hover:bg-amber-50/50 flex flex-col items-center justify-center gap-1.5 text-stone-600 hover:text-amber-800 transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">{t.addBlueprint}</span>
                  </button>
                ) : (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <BlueprintCanvas
                      blueprint={blueprint}
                      isEditor={true}
                      onBlueprintChange={setBlueprint}
                      language={language}
                    />
                  </div>
                )}
              </div>

              {/* 4. SWITCH AT THE END: PAID EVENT (REQUIRES 8-DIGIT CODE) */}
              <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-900 mt-0.5">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <label
                      htmlFor="paid-event-toggle"
                      className="text-sm font-bold text-slate-900 block cursor-pointer"
                    >
                      {t.paidSwitch}
                    </label>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {t.paidSwitchDesc}
                    </p>
                  </div>
                </div>

                {/* Switch Input */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="paid-event-toggle"
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-700"></div>
                </label>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t border-stone-200 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            >
              {t.cancelBtn}
            </button>

            <button
              id="submit-event-btn"
              type="submit"
              disabled={isUploading}
              className="px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 shrink-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>{t.uploadingImage}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isEditing ? t.updateEvent : t.saveEvent}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
