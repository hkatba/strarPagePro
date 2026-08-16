import { fireEvent, render, screen } from '@testing-library/react';
import MemoWidget from '@/components/widgets/MemoWidget';
import type { WidgetOfType } from '@/types';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const createWidget = (content: string): WidgetOfType<'memo'> => ({
  id: 'memo-1',
  type: 'memo',
  size: { w: 2, h: 2 },
  position: { x: 0, y: 0 },
  config: {
    content,
  },
});

describe('MemoWidget', () => {
  it('does not grab homepage focus on initial render when memo is empty', () => {
    render(<MemoWidget widget={createWidget('')} />);

    expect(screen.getByRole('textbox', { name: 'memo' })).not.toHaveFocus();
  });

  it('enters editing mode and focuses the input after clicking existing content', () => {
    render(<MemoWidget widget={createWidget('Existing content')} />);

    fireEvent.click(screen.getByRole('button', { name: 'memo_edit_content' }));

    expect(screen.getByRole('textbox', { name: 'memo' })).toHaveFocus();
  });

  it('refreshes displayed content after external sync updates', () => {
    const { rerender } = render(<MemoWidget widget={createWidget('Old content')} />);

    expect(screen.getByText('Old content')).toBeInTheDocument();

    rerender(<MemoWidget widget={createWidget('New synced content')} />);

    expect(screen.getByText('New synced content')).toBeInTheDocument();
  });
});
