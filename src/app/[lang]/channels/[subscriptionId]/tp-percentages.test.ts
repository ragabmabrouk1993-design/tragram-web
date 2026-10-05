import {
  alignCustomPercentagesToTargets,
  updateTpPercentageDraft,
} from './tp-percentages';

describe('TP percentage editing', () => {
  test('keeps an intermediate typed value as-is until the user finishes editing', () => {
    const initial = {
      TP1: '27.72',
      TP2: '63.97',
      TP3: '8.31',
    };

    expect(updateTpPercentageDraft(initial, 'TP2', '5')).toEqual({
      TP1: '27.72',
      TP2: '5',
      TP3: '8.31',
    });
  });

  test('rebalances values when the selected TP target set changes', () => {
    expect(
      alignCustomPercentagesToTargets(
        { TP1: '25', TP2: '25', TP3: '50' },
        ['TP1', 'TP2']
      )
    ).toEqual({ TP1: '50', TP2: '50' });
  });
});
