import localforage from 'localforage';
import { LibraryBook } from '../types';
import { getBooksFromFirestore, saveBookToFirestore, deleteBookFromFirestore, saveProfileSettings, getProfileSettings } from './firestoreService';

const LEGACY_STORAGE_KEY = 'ai-teachers-library';
const MIGRATION_FLAG_KEY = 'alexandria_firestore_markdown_v3';

const CODEX_MARKDOWN = `# Alexandria Codex: O Livro do Conhecimento

> *"A leitura de todos os bons livros é uma conversação com as mais distintas pessoas dos séculos passados."*  
> — René Descartes

---

## Prólogo: A Biblioteca dos Séculos

No coração da antiga Alexandria erguia-se não apenas um depósito de rolos de papiro, mas o maior santuário da curiosidade humana. Matemáticos, astrônomos, poetas e filósofos cruzavam galerias sustentadas por colunas de mármore, movidos por uma inquietação comum: decifrar as leis invisíveis do universo e a mecânica da alma humana.

Este Codex foi compilado para resgatar a experiência reflexiva, onde cada obra transcende o tempo e ilumina o presente.

---

## Capítulo 1: A Geometria da Mente

Todo pensamento estruturado constrói uma arquitetura invisível. Quando Euclides traçava linhas na areia do porto egípcio, não estava apenas medindo distâncias terrenas; estava fornecendo à razão humana o método para desvendar a ordem cósmica.

### Os Axiomas Fundamentais:
1. **A Clareza Interior**: Antes de ordenar o mundo externo, discipline os conceitos que operam em sua própria mente.
2. **A Proporção Áurea**: O equilíbrio não é a ausência de movimento, mas a harmonia exata entre esforço e contemplação.
3. **A Continuidade**: Grandes saberes não nascem de arroubos passageiros, mas da perseverança silenciosa de estudar todos os dias.

\`\`\`
"Não há estrada real para a geometria."
— Euclides a Ptolomeu I
\`\`\`

---

## Capítulo 2: Cartografia dos Saberes

Os mapas demarcam as fronteiras do que já descobrimos e apontam para os mares do desconhecido. Quando Eratóstenes calculou a circunferência da Terra usando apenas a sombra de uma vara ao meio-dia e a distância entre Alexandria e Siena, provou que a inteligência humana é capaz de abraçar o globo.

### Lições de Exploração:
- Observe os detalhes banais: é nas pequenas sombras que se escondem os grandes cálculos.
- Conecte áreas distintas: a filosofia sem números torna-se vaga; a matemática sem sabedoria torna-se estéril.
- Mantenha seu diário de anotações sempre aberto ao lado de suas leituras.

---

## Capítulo 3: O Cosmos e a Linguagem

As palavras são os vetores do espírito. Através delas, séculos de sabedoria condensam-se em axiomas que transformam nossa maneira de agir no mundo:

- **Epicteto**: *Não são os acontecimentos que perturbam as pessoas, mas o julgamento que elas fazem dos acontecimentos.*
- **Marco Aurélio**: *A alma adquire a cor dos seus pensamentos.*
- **Sêneca**: *Não é que tenhamos pouco tempo, é que perdemos muito dele.*

---

## Epílogo: A Biblioteca Infinita

Jorge Luis Borges concebeu a biblioteca como um labirinto infinito de galerias hexagonais onde todas as frases possíveis já estão escritas. Em cada livro aberto, a luz da consciência se acende novamente.

Que estas páginas sirvam de bússola para seus estudos e reflexões diárias.
`;

const MEDITACOES_MARKDOWN = `# Meditações — Marco Aurélio

> *"Tudo o que ouvimos é uma opinião, não um fato. Tudo o que vemos é uma perspectiva, não a verdade."*  
> — Marco Aurélio, Livro IV

---

## Livro I: Reconhecimento e Gratidão

De meu avô Vero aprendi o bom caráter e a serenidade.  
De minha mãe, a piedade e a generosidade, e não apenas abster-me de fazer o mal, mas até de pensar nele; além disso, a vida frugal e distante dos luxos dos ricos.

De Rústico aprendi a ter a noção clara de que meu caráter carecia de aprimoramento e disciplina; a não me deixar desviar pelo entusiasmo da sofística, nem escrever tratados sobre especulações vãs.

---

## Livro II: Ao Amanhecer

Ao despertar pela manhã, diz a ti mesmo:
> *"Hoje hei de encontrar com pessoas indiscretas, ingratas, insolentes, desleais, invejosas e insociáveis. Todas estas coisas lhes acontecem por ignorância do que é bom e do que é mau."*

Mas eu, que conheci a natureza do Bem como bela, e a do Mal como vil, não posso ser ferido por nenhum deles, pois ninguém pode me envolver no que é degradante. Nem posso me irritar com meu semelhante ou odiá-lo, pois fomos feitos para cooperar, como os pés, as mãos e os olhos.

---

## Livro IV: A Cidadela Interior

As pessoas buscam retiros para si mesmas: casas no campo, praias e montanhas. Mas isso é a maior ingenuidade, pois em qualquer momento que desejares podes recolher-te em ti mesmo. Em nenhum lugar o ser humano encontra retiro mais tranquilo ou mais desprovido de aflições do que na sua própria alma.

Concede a ti mesmo constantemente esse recolhimento e renova-te. E que sejam breves e fundamentais as máximas que, tão logo lembradas, apaguem toda inquietação.

---

## Livro XII: O Tempo e o Destino

Considera como o tempo voa veloz e como todas as coisas que amamos ou tememos logo se transformarão em fumaça ou cinzas. Age com honra no presente, fala com verdade, acolhe o destino com serenidade. O resto não depende de ti.
`;

const ARTE_DA_GUERRA_MARKDOWN = `# A Arte da Guerra — Sun Tzu

> *"A suprema arte da guerra consiste em derrotar o inimigo sem travar uma batalha."*

---

## Capítulo I: Estimativas e Planejamento

A arte da guerra é de importância vital para o Estado. É uma questão de vida ou morte, um caminho para a segurança ou para a ruína. Portanto, deve ser estudada minuciosamente sob cinco fatores fundamentais:

1. **A Lei Moral (Tao)**: Faz com que o povo esteja em total harmonia com seus líderes, acompanhando-os sem temer o perigo.
2. **O Céu (Clima)**: Representa o frio e o calor, o dia e a noite, a passagem das quatro estações.
3. **A Terra (Terreno)**: Compreende distâncias longas e curtas, perigo e segurança, terreno aberto e passagens estreitas.
4. **O Comandante (Liderança)**: Significa as virtudes da sabedoria, sinceridade, benevolência, coragem e rigor.
5. **O Método e a Disciplina**: A organização das divisões, a hierarquia e o controle dos suprimentos.

---

## Capítulo III: O Ataque Estratégico

Na guerra, o melhor método é tomar o país inimigo intacto; destruí-lo é inferior. Capturar o exército inimigo inteiro é melhor do que aniquilá-lo.

- Se conheces o inimigo e conheces a ti mesmo, não precisas temer o resultado de cem batalhas.
- Se conheces a ti mesmo mas não o inimigo, para cada vitória ganha sofrerás também uma derrota.
- Se não conheces nem o inimigo nem a ti mesmo, sucumbirás em todas as batalhas.

---

## Capítulo VI: Pontos Fracos e Fortes

Aquele que chega primeiro ao campo de batalha aguarda descansado a chegada do adversário. Aquele que chega atrasado terá de precipitar-se para a luta fatigado.

A água não possui forma constante; na guerra não existem condições imutáveis. Aquele que consegue obter a vitória adaptando suas táticas à situação do inimigo pode ser chamado de mestre divino.
`;

const INITIAL_PROJECT_BOOKS: (Omit<LibraryBook, 'id'> & { markdownContent: string })[] = [
  {
    title: 'Alexandria Codex: O Livro do Conhecimento',
    author: 'Alexandria Codex',
    coverPath: '/covers/alexandria-codex.svg',
    contentPath: '',
    content: CODEX_MARKDOWN,
    markdownContent: CODEX_MARKDOWN,
    status: 'reading',
    currentPage: 1,
    totalPages: 12,
    progress: 0.08,
    readingOrder: 0,
    favorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    format: 'md',
    categories: ['Filosofia', 'Conhecimento'],
    rating: 5
  },
  {
    title: 'Meditações',
    author: 'Marco Aurélio',
    coverPath: '/covers/meditacoes.svg',
    contentPath: '',
    content: MEDITACOES_MARKDOWN,
    markdownContent: MEDITACOES_MARKDOWN,
    status: 'unread',
    currentPage: 0,
    totalPages: 24,
    progress: 0.0,
    readingOrder: 1,
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    format: 'md',
    categories: ['Estadistas', 'Estadismo', 'Filosofia'],
    rating: 5
  },
  {
    title: 'A Arte da Guerra',
    author: 'Sun Tzu',
    coverPath: '/covers/a-arte-da-guerra.svg',
    contentPath: '',
    content: ARTE_DA_GUERRA_MARKDOWN,
    markdownContent: ARTE_DA_GUERRA_MARKDOWN,
    status: 'unread',
    currentPage: 0,
    totalPages: 18,
    progress: 0.0,
    readingOrder: 2,
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    format: 'md',
    categories: ['Estratégia', 'Liderança'],
    rating: 4
  }
];

export async function runFirebaseMigration(): Promise<{ migratedBooksCount: number; migratedProfile: boolean }> {
  let migratedBooksCount = 0;
  let migratedProfile = false;

  try {
    // 1. Profile Setup in Firestore
    const legacyUserName = localStorage.getItem('userName');
    const legacyUserImage = localStorage.getItem('userImage');
    const legacyUserPlan = localStorage.getItem('userPlan') || 'Starter';

    const currentProfile = await getProfileSettings();
    if (!currentProfile) {
      await saveProfileSettings({
        name: legacyUserName || 'Leitor de Alexandria',
        avatarUrl: legacyUserImage || '/avatars/default.svg',
        plan: legacyUserPlan,
      });
      migratedProfile = true;
    }

    // 2. One-time Purge of Auto-Seeded Default Books from Firestore & Local Cache
    const PURGE_DEFAULT_BOOKS_KEY = 'alexandria_purged_defaults_v6';
    if (localStorage.getItem(PURGE_DEFAULT_BOOKS_KEY) !== 'true') {
      try {
        const existingBooks = await getBooksFromFirestore();
        const defaultTitles = [
          'Alexandria Codex: O Livro do Conhecimento',
          'Meditações',
          'A Arte da Guerra'
        ];

        for (const book of existingBooks) {
          if (defaultTitles.includes(book.title)) {
            await deleteBookFromFirestore(book.id);
          }
        }

        await localforage.removeItem('alexandria-books-cache-v2');
      } catch (e) {
        console.warn('Error purging default seed books:', e);
      }
      localStorage.setItem(PURGE_DEFAULT_BOOKS_KEY, 'true');
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    }
  } catch (err) {
    console.error('Starter migration error:', err);
  }

  return { migratedBooksCount, migratedProfile };
}
