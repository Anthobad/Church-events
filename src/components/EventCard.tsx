import React from 'react';
import { ChurchEvent, Language } from '../types';
import { translations } from '../services/i18n';
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  Eye,
  Edit2,
  Trash2,
  Users,
  KeyRound,
  LayoutGrid,
  Sparkles,
  ScanLine
} from 'lucide-react';

interface EventCardProps {
  event: ChurchEvent;
  language: Language;
  isAdmin: boolean;
  isLiked: boolean;
  registrationCount: number;
  onCardClick: (event: ChurchEvent) => void;
  onLikeClick: (eventId: string, e: React.MouseEvent) => void;
  onEditClick?: (event: ChurchEvent, e: React.MouseEvent) => void;
  onDeleteClick?: (event: ChurchEvent, e: React.MouseEvent) => void;
  onVerifyClick?: (event: ChurchEvent, e: React.MouseEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  language,
  isAdmin,
  isLiked,
  registrationCount,
  onCardClick,
  onLikeClick,
  onEditClick,
  onDeleteClick,
  onVerifyClick
}) => {
  const t = translations[language];

  return (
    <article
      id={`event-card-${event.id}`}
      onClick={() => onCardClick(event)}
      className="group relative bg-white/95 hover:bg-white backdrop-blur-sm rounded-2xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row gap-4 p-4 sm:p-5"
    >
      {/* Admin Action Buttons (Top corner) */}
      {isAdmin && (
        <div
          id={`admin-actions-${event.id}`}
          className="absolute top-3.5 end-3.5 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-stone-200"
          onClick={(e) => e.stopPropagation()}
        >
          {onVerifyClick && (
            <button
              id={`verify-event-btn-${event.id}`}
              type="button"
              onClick={(e) => onVerifyClick(event, e)}
              className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title={t.ticketVerificationTab}
              aria-label={t.ticketVerificationTab}
            >
              <ScanLine className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          {onEditClick && (
            <button
              id={`edit-event-btn-${event.id}`}
              type="button"
              onClick={(e) => onEditClick(event, e)}
              className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              title={t.editEvent}
              aria-label={t.editEvent}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDeleteClick && (
            <button
              id={`delete-event-btn-${event.id}`}
              type="button"
              onClick={(e) => onDeleteClick(event, e)}
              className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title={t.deleteEvent}
              aria-label={t.deleteEvent}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Event Image (Shows to the left of the event comp if exists; if not ignore) */}
      {event.imageUrl ? (
        <div
          id={`event-image-container-${event.id}`}
          className="sm:w-48 md:w-56 h-40 sm:h-auto shrink-0 rounded-xl overflow-hidden bg-stone-100 relative group-hover:opacity-95 transition-opacity"
        >
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover object-center transform group-hover:scale-102 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // Gracefully handle broken image links
              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
            }}
          />
          {/* Subtle overlay badge for blueprint or paid */}
          <div className="absolute bottom-2 start-2 flex flex-wrap gap-1">
            {event.type === 'registration_required' && event.blueprint && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900/80 text-white backdrop-blur-xs">
                <LayoutGrid className="w-3 h-3" />
                <span>Blueprint</span>
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Main Content Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Tags & Badges */}
          <div className={`flex flex-wrap items-center gap-2 mb-2 ${isAdmin ? 'pe-24 sm:pe-28' : 'pe-2'}`}>
            {event.type === 'open' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3 h-3" />
                <span>{t.openForAll} ({t.freeEvent})</span>
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  <Users className="w-3 h-3" />
                  <span>{t.registrationRequired}</span>
                </span>

                {event.isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    <KeyRound className="w-3 h-3" />
                    <span>{t.paidEvent}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                    {t.freeEvent}
                  </span>
                )}
              </>
            )}

            {isAdmin && registrationCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                <Users className="w-3 h-3" />
                <span>
                  {registrationCount}{' '}
                  {language === 'ar' ? 'مسجّل' : language === 'fr' ? 'inscrit(s)' : 'registered'}
                </span>
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            id={`event-title-${event.id}`}
            className={`text-lg sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-amber-800 transition-colors mb-2 line-clamp-2 break-words ${
              isAdmin && !event.imageUrl ? 'pe-24 sm:pe-0' : ''
            }`}
          >
            {event.title}
          </h2>

          {/* Description (Under title, a few lines if big or all if it fits) */}
          <p
            id={`event-desc-${event.id}`}
            className="text-sm text-stone-600 line-clamp-2 sm:line-clamp-3 leading-relaxed mb-3 break-words"
          >
            {event.description}
          </p>

          {/* Metadata chips: Date, Time, Location */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-medium text-stone-500">
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{event.date}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{event.time}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full truncate">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          </div>
        </div>

        {/* Card Footer: Views and Likes */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Real-time views count */}
            <span
              id={`views-count-${event.id}`}
              className="inline-flex items-center gap-1 text-stone-500"
              title={`${event.views} ${t.views}`}
            >
              <Eye className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{event.views}</span>
            </span>

            {/* Like button with active heart state */}
            <button
              id={`like-btn-${event.id}`}
              type="button"
              onClick={(e) => onLikeClick(event.id, e)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                isLiked
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 scale-102'
                  : 'text-stone-600 hover:text-rose-600 hover:bg-stone-100'
              }`}
              aria-label={t.likes}
            >
              <Heart
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-stone-400 group-hover:text-stone-600'
                }`}
              />
              <span>{event.likes}</span>
            </button>
          </div>

          <span className="text-amber-800 font-semibold group-hover:translate-x-0.5 group-hover:-translate-x-0.5 transition-transform text-xs sm:text-[13px] inline-flex items-center gap-1 min-w-0 truncate">
            <span className="truncate">{t.clickToViewMore}</span>
            <span className="inline-block rtl:rotate-180 shrink-0">&rarr;</span>
          </span>
        </div>
      </div>
    </article>
  );
};
