import { GENRE_COLORS_MAP } from '@/constants/colors';

export function getGenreColor(genre) {
    return GENRE_COLORS_MAP[genre] || '#222222';
}