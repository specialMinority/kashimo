/** Local calendar dates, so a deadline today is never marked overdue at midnight UTC. */
export const localDateKey = (date = new Date()): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isOverdueDate = (date?: string): boolean => !!date && date < localDateKey();

export const validDateInput = (value: string): boolean => {
    const normalized = value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
    const [y, m, d] = normalized.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};
