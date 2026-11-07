# Hyperschedule GE codes vs catalog attributes

**174** course(s) offered this term disagree between the catalog and the schedule.
**10** unrecognised Pomona course-area code(s).

## Unrecognised Pomona codes

Each of these is a GE attribute being dropped from every course that carries it.
Add it to `HYPERSCHEDULE_GE_CODES` in `packages/shared`, or to the known
non-attribute list in `src/hyperschedule/geCodes.ts`, before the next run.

- unrecognised Pomona course-area code "1P1" on 8 course(s), e.g. CHNT 168 PO, RUST 079 PO, SPAN 101 PO
- unrecognised Pomona course-area code "1P10" on 18 course(s), e.g. PHIL 001 PO, PHIL 030 PZ, PHIL 031 PO
- unrecognised Pomona course-area code "1P2" on 5 course(s), e.g. ASTR 001 PO, BIOL 040 PO, PSYC 160 PO
- unrecognised Pomona course-area code "1P3" on 17 course(s), e.g. ECON 052 PO, ECON 102 PO, MATH 030 CM
- unrecognised Pomona course-area code "1P4" on 11 course(s), e.g. ASTR 101 PO, ECON 057 PO, ECON 107 PO
- unrecognised Pomona course-area code "1P5" on 14 course(s), e.g. ARHI 150 SC, ARHI 154 SC, ARHI 185 SC
- unrecognised Pomona course-area code "1P6" on 15 course(s), e.g. ART 005 PO, ART 010 PO, ART 020 PO
- unrecognised Pomona course-area code "1P7" on 11 course(s), e.g. ECON 051 PO, ECON 101 PO, LGCS 010 PO
- unrecognised Pomona course-area code "1P8" on 9 course(s), e.g. HIST 020 PO, HIST 031 CH, HIST 011 PO
- unrecognised Pomona course-area code "1P9" on 7 course(s), e.g. HIST 017 CH, POLI 005 PO, PSYC 084 CH

## How to resolve

Hyperschedule reflects what the Registrar published for the term; the catalog
reflects the course record. A course retagged after the catalog was built shows
up here first. Advisory only — the pipeline changes nothing automatically.

| Course | Title | Catalog | Sections |
|---|---|---|---|
| AFRI 145 PO | Sounds & Sonics of Black Life | — | AREA_3 |
| AFRI 155 PO | We Shoot Back | — | AREA_3 |
| AMST 103 PO | Intro to American Cultures | — | AREA_3 |
| AMST 121 PO | Indigenous Ecologies | — | AREA_3 |
| ANTH 080 PO | The Horror of Everyday Life | — | AREA_2 |
| ANTH 105 PO | Mthds in Anthropological Inquiry | AREA_2, SPEAKING_INTENSIVE | AREA_2 |
| ANTH 107 PO | Medical Anthropology | ANALYZING_DIFFERENCE, AREA_2 | ANALYZING_DIFFERENCE, AREA_2, SPEAKING_INTENSIVE |
| ANTH 125 PO | Disability, Race, & the Bodymind | — | AREA_2 |
| ANTH 151 PO | Logistics and Counter-logistics | — | AREA_2 |
| ARHI 114 PO | Print Cultures: Hist and Theory | — | AREA_1 |
| ARHI 128 PO | Mughal Art and Architecture | — | AREA_1 |
| ARHI 133 PO | Mexican Modernism | — | AREA_1 |
| ARHI 186J PO | The Transmitted Image | — | AREA_1 |
| ARHI 186Q PO | Exhibition as Argument | — | AREA_1 |
| ARHI 186R PO | Art & Arch Ancient Americas | — | AREA_1 |
| ARHI 186S PO | Arts of Spain and Spanish World | — | AREA_1 |
| ARHI 186V PO | Contemporary Caribbean Art | — | AREA_1 |
| ART 001 PO | Art of Attention | — | AREA_6 |
| ART 101 PO | Weaving as Art: Tapestry & Loom | — | AREA_6 |
| ART 110 PO | More Painting | — | AREA_6 |
| ART 123 PO | Mending: Practical & Symbolic | — | AREA_6 |
| ART 177 PO | Rethinking Painting | — | AREA_6 |
| ASAM 070 PO | Surveillance | — | AREA_3 |
| BIOL 104A PO | Sem in Conserving Biodiversity | — | AREA_4, SPEAKING_INTENSIVE |
| BIOL 173 PO | Genomics & Bioinformatics w/Lab | AREA_4, SPEAKING_INTENSIVE | AREA_4 |
| BIOL 189S PO | Spatial Ecology | — | AREA_4 |
| CHEM 010A PO | General Chemistry w/Laboratory | — | AREA_4 |
| CHEM 010B PO | General Chemistry w/Laboratory | — | AREA_4 |
| CHEM 020A PO | Discovering Chemistry w/ Lab | — | AREA_4 |
| CHEM 020B PO | Discovering Chemistry w/ Lab | — | AREA_4 |
| CHEM 050 PO | Gen Chemistry w/Lab Accelerated | — | AREA_4 |
| CHEM 101 PO | Organic Chemistry w/Laboratory | — | AREA_4 |
| CHEM 102 PO | Physical Chemistry w/Lab | — | AREA_4 |
| CHEM 103 PO | Enviro Analyt Chem W/Lab | — | AREA_4 |
| CHEM 104 PO | Inorganic Chemistry w/ Lab | — | AREA_4 |
| CHEM 105 PO | Biochemistry w/Laboratory | — | AREA_4, WRITING_INTENSIVE |
| CHEM 112 PO | NMR Spectroscopy | — | AREA_4 |
| CHEM 116 PO | Natural Products | — | AREA_4 |
| CHIN 111H PO | Advanced Chinese for Bilinguals | — | AREA_1, LANGUAGE |
| CHIN 124 PO | Cultural Landscapes of China | — | AREA_1 |
| CHIN 129 PO | International Interethnic China | — | LANGUAGE |
| CHIN 135 PO | Chin Gam Cul & Digit Trans | — | AREA_1 |
| CHST 102 PO | Latinx Urbanism: Voices from LA | — | AREA_3 |
| CLAS 118 PO | Ancient Race and Ethnicity | — | AREA_1 |
| CSCI 051 PO | Introduction to Computer Science | — | AREA_5 |
| CSCI 126 PO | Programming Interactivity | — | AREA_5 |
| CSCI 134 PO | Operating Systems | — | AREA_5 |
| CSCI 181AG PO | Algorithmic Game Theory | — | AREA_5 |
| CSCI 181DV PO | Advanced Data Visualization | — | AREA_5 |
| CSCI 181E PO | Ethical Software Systems | — | AREA_5 |
| DANC 182 PO | Dance Production Practicum | — | AREA_6 |
| EA 077 PO | The Environmental Polycrisis | — | AREA_2 |
| EA 082 PO | Values and the Environment | — | AREA_2 |
| EA 095 PO | Philosophies of Place | — | AREA_2 |
| EA 189G PO | Energy History and Justice | — | AREA_2 |
| ECON 113 PO | Economics of Financial Markets | — | AREA_2 |
| ECON 143 PO | Economics and Film | — | AREA_2 |
| ENGL 029 PO | American Misfits: Short Stories | — | AREA_1 |
| ENGL 033 PO | Some Versions of The Tempest | — | AREA_1 |
| ENGL 035 PO | Shakespeare and Cinema | — | AREA_1 |
| ENGL 039 PO | Plague and Literature | — | AREA_1 |
| ENGL 082 PO | Futurecraft | — | AREA_1 |
| ENGL 095 PO | Latinx Speculative Fictions | — | ANALYZING_DIFFERENCE, AREA_1 |
| ENGL 097 PO | The Queer Renaissance | — | AREA_1 |
| ENGL 157 PO | Diaries and Daybooks | — | AREA_6, WRITING_INTENSIVE |
| ENGL 170H PO | Latinx Lit & Cultural Critique | — | ANALYZING_DIFFERENCE, AREA_1, WRITING_INTENSIVE |
| ENGL 170X PO | Asian Am Lit & Cultural Critique | AREA_1 | ANALYZING_DIFFERENCE, AREA_1 |
| ENGL 181A PO | The Poetic Sequence | — | AREA_6 |
| FREN 101 PO | From Page to Paris | AREA_1, LANGUAGE, SPEAKING_INTENSIVE, WRITING_INTENSIVE | AREA_1, SPEAKING_INTENSIVE, WRITING_INTENSIVE |
| FREN 123 PO | Art, Politics & Power in France | — | AREA_1 |
| FREN 189C PO | Toxicity, Secrecy, Agency | — | AREA_1 |
| GEOL 111 PO | GIS for Geologists | — | AREA_4 |
| GEOL 151 PO | Geological Field Methods | — | AREA_4 |
| GEOL 177 PO | Chemical Oceanography | — | AREA_4 |
| GEOL 179 PO | Isotopes in Earth Sciences | — | AREA_4 |
| GRMT 147A PO | Screening Germany | — | AREA_1 |
| GWS 036 PO | Introduction to Queer Studies | — | AREA_3 |
| GWS 081 PO | Healing Justice and Care Praxis | — | AREA_3 |
| GWS 143 PO | Black Genders, Black Sexualities | — | AREA_3 |
| GWS 146 PO | QF Science & Technology Studies | — | AREA_3 |
| GWS 166 PO | Witchcraft | AREA_3 | AREA_3, SPEAKING_INTENSIVE |
| GWS 181 PO | Queer Feminist Affect Theories | — | AREA_3 |
| GWS 183 PO | Transnational Feminist Theories | AREA_3 | AREA_3, WRITING_INTENSIVE |
| GWS 188 PO | More-than-Human Worlds | — | AREA_3 |
| HIST 061 PO | History of East Asia to 1650 | — | AREA_3 |
| HIST 101AD PO | Age of Conquest and Continuity | — | AREA_3 |
| HIST 101EJ PO | Early Modern Japan | — | AREA_3 |
| HIST 101H PO | American History, 1500-1900 | AREA_3 | AREA_3, WRITING_INTENSIVE |
| HIST 101Y PO | Decolonization of Euro Empires | — | AREA_3, WRITING_INTENSIVE |
| HIST 118 PO | Native American History | AREA_3 | ANALYZING_DIFFERENCE, AREA_3 |
| HIST 165C PO | The Chinese Cultural Revolution | — | AREA_3 |
| HIST 169 PO | Ghosts and Gods in Japan | — | AREA_3 |
| HIST 170 PO | Early Modern Russia | — | AREA_3 |
| HIST 171 PO | Scandinavian History to 1800 | — | AREA_3 |
| HIST 176 PO | Legal Histories of Empire | — | AREA_3 |
| HIST 185 PO | Imperial Cartographies | — | AREA_3 |
| IR 075 PO | Global Social Movements | — | AREA_2 |
| IR 170 PO | Corruption/Kleptocracy Eurasia | — | AREA_2 |
| JPNT 150 PO | Language and Society in Japan | — | AREA_1 |
| LAST 184 PO | Citizen Participation in Lat Am | — | AREA_3 |
| LGCS 113 PO | Contact Languages | — | AREA_2 |
| LGCS 118 PO | Morphosyntax | AREA_2, SPEAKING_INTENSIVE, WRITING_INTENSIVE | AREA_2, SPEAKING_INTENSIVE |
| MATH 185 PO | Methods in Modern Modeling | — | AREA_5 |
| MS 044 PO | Media and Transitional Justice | — | AREA_1 |
| MS 052 PO | Global Europe | — | AREA_1 |
| MS 075 PO | Critical Theory and Pop Cult | — | AREA_1 |
| MS 079 PO | Media and Counter Culture | — | AREA_1 |
| MS 086 PO | Noir: Novels and Films | — | AREA_1 |
| MS 137 PO | Video Games in Memory | — | AREA_1 |
| MS 148A PO | Surveillance and the Media | — | AREA_1 |
| MS 148H PO | Media and Nationalism | — | AREA_1 |
| MUS 014 PO | Individual Instruction, Level I+ | — | AREA_6 |
| MUS 040 PO | Chamber Music | AREA_6 | — |
| MUS 047 PO | Music in Dialog | — | AREA_1, SPEAKING_INTENSIVE |
| MUS 092 PO | Linguistic Elements of Music | — | AREA_1 |
| MUS 140 PO | Chamber Music | AREA_6 | — |
| NEUR 042 PO | Seeing & Believing | — | AREA_4 |
| NEUR 048 PO | The Hungry Brain | — | AREA_4 |
| NEUR 122 PO | Coding the Brain | — | AREA_4 |
| NEUR 140 PO | The Rhythmic Brain w/Lab | — | AREA_4 |
| NEUR 151 PO | Neural Computation | — | AREA_4 |
| NEUR 172 PO | Context Shapes Behavior | — | AREA_4 |
| NEUR 180W PO | Biol Basis of Psychopathology | — | AREA_4, SPEAKING_INTENSIVE, WRITING_INTENSIVE |
| NEUR 189E PO | Adolescent Neurodevelopment | — | AREA_4 |
| PE 016C PO | Weight-Training- Advanced | — | PHYSICAL_EDUCATION |
| PE 030 PO | Line Dancing | — | PHYSICAL_EDUCATION |
| PE 061A PO | Cycling & Strength | — | PHYSICAL_EDUCATION |
| PHIL 031 PO | Ethical Theory: Historical | — | AREA_3, SPEAKING_INTENSIVE |
| PHIL 038 PO | Medical Ethics | — | AREA_3, SPEAKING_INTENSIVE |
| PHIL 048 PO | Intimate Relationships | — | AREA_3 |
| PHIL 049 PO | Classical Buddhist Philosophy | — | AREA_3 |
| PHIL 163 PO | Advanced Logic | — | AREA_3 |
| PHIL 186A PO | Topics in Aristotelianism | — | AREA_2 |
| PHYS 070 PO | Big Ideas in Modern Physics | ANALYZING_DIFFERENCE, AREA_4 | AREA_4 |
| PHYS 073 PO | Enhanced Intro Mechanics | — | AREA_4 |
| PHYS 075 PO | Foundations of Elec and Mag | — | AREA_4 |
| POLI 033B PO | Amer Constit II: Rights/Liberty | ANALYZING_DIFFERENCE, AREA_2, WRITING_INTENSIVE | ANALYZING_DIFFERENCE, AREA_2 |
| POLI 089B PO | Fndn Western Political Thought | — | AREA_2 |
| POLI 089C PO | Ideology & Political Ideologies | — | AREA_2 |
| POLI 124 PO | Contemporary Political Theory | — | AREA_2 |
| POLI 181 PO | Ghibli and Foundations Poli Sci | — | AREA_2, WRITING_INTENSIVE |
| POLI 189D PO | Latino Politics | — | AREA_2 |
| POLI 189E PO | Major Issues in Foreign Policy | — | AREA_2 |
| POLI 189J PO | Political Psychology | — | AREA_2 |
| POLI 189K PO | Contemporary Democratic Theory | — | AREA_2 |
| POLI 189L PO | Africa After the End of History | — | AREA_2 |
| POLI 189M PO | Public Policy Process | — | AREA_2 |
| POLI 189N PO | American Grand Strategy | — | AREA_2 |
| POLI 189V PO | Economic Democracy | — | AREA_2 |
| POLI 190B PO | Sr Sem: Comparativ/Intl Politics | SPEAKING_INTENSIVE | — |
| PSYC 138 PO | Social Identity | — | AREA_2 |
| PSYC 164 PO | Human Relationships with Lab | — | AREA_2 |
| PSYC 165 PO | Perspectives on Rationality | — | AREA_2 |
| PSYC 180I PO | Narrating The Self | — | AREA_2 |
| PSYC 189C PO | Cognition and Concepts | — | AREA_2 |
| PSYC 189D PO | Seminar: Minds and Machines | — | AREA_2, WRITING_INTENSIVE |
| RLST 106 PO | Readings in Islamic Philosophy | — | AREA_3 |
| RLST 144 PO | Minorities in Muslim World | — | AREA_3 |
| RLST 160 PO | Maimonides | — | AREA_3 |
| SOC 166 PO | Rebuilding Communities in Crises | — | AREA_2 |
| SOC 189M PO | Medicalization of Social Life | — | AREA_2 |
| SOC 189R PO | Sociology of Religion | — | AREA_2 |
| STS 010 PO | Intro to Sci, Tech, and Society | — | AREA_2 |
| THEA 018 PO | Stage Combat | — | AREA_6 |
| THEA 019 PO | Puppet Design | — | AREA_6 |
| THEA 022 PO | Lighting Technology | — | AREA_6 |
| THEA 026 PO | CAD: Drafting and Modeling | — | AREA_6 |
| THEA 030 PO | World Theatre and Drama 1 | AREA_1 | AREA_1, WRITING_INTENSIVE |
| THEA 052C PO | Theatre Production: Practicum | — | AREA_6 |
| THEA 085 PO | Advanced Lighting Design | — | AREA_1, AREA_6 |
| THEA 089C PO | Movement for Actors and Others | — | AREA_6 |
| THEA 141 PO | Dramaturgy | AREA_6 | AREA_6, SPEAKING_INTENSIVE |
| THEA 142 PO | Intro to Performance Studies | — | AREA_1 |
| THEA 172 PO | Fundamentals of TV Writing | — | AREA_6 |
