const { formatarCodigo, idDoContador } = require('../src/utils/codigo');
const { normalizar } = require('../src/utils/texto');

describe('formatarCodigo', () => {
  it('monta FER-CAT-0001 para ferramenta', () => {
    expect(formatarCodigo('ferramenta', 'ELE', 1)).toBe('FER-ELE-0001');
  });

  it('usa o prefixo CON para material de consumo', () => {
    expect(formatarCodigo('consumo', 'MAN', 37)).toBe('CON-MAN-0037');
  });

  it('passa de 4 dígitos sem cortar o número', () => {
    expect(formatarCodigo('ferramenta', 'ELE', 12345)).toBe('FER-ELE-12345');
  });

  it('tem um contador separado por prefixo e categoria', () => {
    expect(idDoContador('ferramenta', 'ELE')).toBe('FER-ELE');
    expect(idDoContador('consumo', 'ELE')).toBe('CON-ELE');
  });
});

describe('normalizar', () => {
  it('ignora acento e maiúsculas na busca', () => {
    expect(normalizar('Esmerilhadeira ÂNGULO')).toBe('esmerilhadeira angulo');
  });
});
