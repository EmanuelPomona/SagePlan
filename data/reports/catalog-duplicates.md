# Catalog duplicate editions

Coursedog returned 146 duplicate course record(s). Where two editions
of one course disagree, the pipeline keeps the **most complete** record (more GE
attributes first, then more catalog detail). Newest does NOT win: the newer edition
is frequently the one with an empty `attributes` array.

| Course | Title | Attributes kept | Attributes discarded | Reason |
|---|---|---|---|---|
| POLI 193 PO | Senior Oral Comprehensive Exam | — | — | kept the edition with more catalog detail |
| PE 087 PO | FITNESS & WELLNESS | PHYSICAL_EDUCATION | — | kept the edition carrying more GE attributes |
| RUST 079 PO | Russian Short Fiction | AREA_1, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | kept the edition with more catalog detail |
| RUST 175 PO | Russia: Empire and Identity | AREA_1, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | kept the edition with more catalog detail |
| MUS 118 PO | Composition | AREA_6 | AREA_6 | kept the edition with more catalog detail |
| MUS 082L PO | Lab, Theory III | — | — | kept the edition with more catalog detail |
| PHIL 046 PO | Feminism and Science (CP) | AREA_3, ANALYZING_DIFFERENCE, COMMUNITY_PARTNERSHIP | AREA_3, ANALYZING_DIFFERENCE, COMMUNITY_PARTNERSHIP | kept the edition with more catalog detail |
| PHIL 030 PO | Social Philosophy | AREA_3, ANALYZING_DIFFERENCE | AREA_3, ANALYZING_DIFFERENCE | kept the edition with more catalog detail |
| PHIL 002 PO | Introduction to Ethics | AREA_3, SPEAKING_INTENSIVE | AREA_3, SPEAKING_INTENSIVE | kept the edition with more catalog detail |
| PE 088 PO | LEADERSHIP & FITNESS | PHYSICAL_EDUCATION | — | kept the edition carrying more GE attributes |
| PE 080 PO | Comm Engagement Lacrosse (CP) | COMMUNITY_PARTNERSHIP, PHYSICAL_EDUCATION | COMMUNITY_PARTNERSHIP, PHYSICAL_EDUCATION | kept the edition with more catalog detail |
| PE 026A PO | Shotokan Karate Int/Adv | PHYSICAL_EDUCATION | PHYSICAL_EDUCATION | kept the edition with more catalog detail |
| PHYS 070 PO | Big Ideas in Modern Physics | AREA_4, ANALYZING_DIFFERENCE | AREA_4, ANALYZING_DIFFERENCE | kept the edition with more catalog detail |
| CSCI 191 PO | Sr Research/Thesis Computer Sci | — | — | kept the edition with more catalog detail |
| DANC 150A PO | Cultural Styles | AREA_6, PHYSICAL_EDUCATION | AREA_6, PHYSICAL_EDUCATION | kept the edition with more catalog detail |
| CSCI 152 PO | Neural Networks | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| THEA 002 PO | Intro to Theatrical Design | AREA_6, SPEAKING_INTENSIVE | AREA_6, SPEAKING_INTENSIVE | editions are equivalent; kept one deterministically |
| CSCI 054 PO | Math Foundations of CS | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| CSCI 101 PO | Intro to Languages and Theory | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| GEOL 020C PO | Environmental Geology | AREA_4 | AREA_4 | editions are equivalent; kept one deterministically |
| CSCI 062 PO | Data Structures Adv Programming | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| PE 026 PO | Shotokan Karate - Beginning | PHYSICAL_EDUCATION | PHYSICAL_EDUCATION | kept the edition with more catalog detail |
| GEOL 189C PO | Chemical Oceanography | AREA_4 | AREA_4 | kept the edition with more catalog detail |
| GWS 173 PO | Premod. Hist Gender & Sexuality | AREA_3 | AREA_3 | kept the edition with more catalog detail |
| CSCI 105 PO | Computer Systems | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| PPE 195 PO | Philo/Politics/Econ Sr Exercise | — | — | kept the edition with more catalog detail |
| THEA 100S PO | Acting Studio:Acting Shakespeare | AREA_6, SPEAKING_INTENSIVE | AREA_6, SPEAKING_INTENSIVE | kept the edition with more catalog detail |
| SPAN 001 PO | Elementary Spanish | — | — | kept the edition with more catalog detail |
| SPAN 140 PO | From Borges to "Literatura Lite" | AREA_1, LANGUAGE | — | kept the edition carrying more GE attributes |
| THEA 115O PO | Applied Theatre | AREA_6 | AREA_6 | kept the edition with more catalog detail |
| ANTH 053 PO | Language and Globalization | AREA_2, SPEAKING_INTENSIVE | AREA_2, SPEAKING_INTENSIVE | kept the edition with more catalog detail |
| MUS 121 PO | Sem in Music Hist (Pre-1750) | AREA_1, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | kept the edition with more catalog detail |
| SPAN 125B PO | 20th-C Latin American Literature | AREA_1, LANGUAGE | AREA_1, LANGUAGE | kept the edition with more catalog detail |
| POLI 172 PO | City Research Task Force | AREA_2 | AREA_2 | kept the edition with more catalog detail |
| FREN 129 PO | Proust's Time Machine | AREA_1, LANGUAGE | AREA_1, LANGUAGE | kept the edition with more catalog detail |
| GWS 166 PO | Witchcraft | AREA_3 | — | kept the edition carrying more GE attributes |
| CSCI 188 PO | Computer Science Colloquium | — | — | kept the edition with more catalog detail |
| LGCS 118 PO | Morphosyntax | AREA_2, SPEAKING_INTENSIVE, WRITING_INTENSIVE | AREA_2, SPEAKING_INTENSIVE, WRITING_INTENSIVE | kept the edition with more catalog detail |
| MUS 122 PO | Sem in Music Hist (1750-c.1920) | AREA_1, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | kept the edition with more catalog detail |
| CSCI 190 PO | Computer Science Senior Seminar | SPEAKING_INTENSIVE | SPEAKING_INTENSIVE | kept the edition with more catalog detail |
| CHEM 150 PO | Intro to Medicinal Chemistry | AREA_4 | — | kept the edition carrying more GE attributes |
| CHEM 151 PO | Advanced Biochemistry | — | — | kept the edition with more catalog detail |
| CHEM 115 PO | Computational Organic Chem w/Lab | AREA_4, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| CHEM 101 PO | Organic Chemistry w/Laboratory | — | — | editions are equivalent; kept one deterministically |
| CHEM 102 PO | Physical Chemistry w/Lab | — | — | editions are equivalent; kept one deterministically |
| CHEM 010AL PO | Lab, General Chemistry | — | — | editions are equivalent; kept one deterministically |
| CSCI 050 PO | Fundamentals of Programming | — | — | kept the edition with more catalog detail |
| ENGL 157 PO | Diaries and Daybooks | — | — | editions are equivalent; kept one deterministically |
| ECON 147 PO | Economics for Public Policy | — | — | editions are equivalent; kept one deterministically |
| SOC 191 PO | Senior Thesis | — | — | editions are equivalent; kept one deterministically |
| SPAN 192 PO | Senior Paper | — | — | kept the edition with more catalog detail |
| GEOL 133 PO | Paleoclimatology | AREA_4 | — | kept the edition carrying more GE attributes |
| ENGL 072 PO | City Comedy | AREA_1 | — | kept the edition carrying more GE attributes |
| HIST 167 PO | Archived East Asia | AREA_3 | — | kept the edition carrying more GE attributes |
| ENGL 084 PO | Dream Lore | AREA_1 | — | kept the edition carrying more GE attributes |
| GWS 166 PO | Witchcraft | AREA_3 | — | kept the edition carrying more GE attributes |
| ID 174 PO | Diplomacy and Human Rights | AREA_2 | — | kept the edition carrying more GE attributes |
| LGCS 188 PO | Topics in Phonetics | AREA_2 | — | kept the edition carrying more GE attributes |
| MS 072 PO | Representing Britain | AREA_1 | — | kept the edition carrying more GE attributes |
| BIOL 152 PO | Population and Quant. Genetics | AREA_4 | — | kept the edition carrying more GE attributes |
| GWS 173 PO | Premodern Intersectionality | AREA_3 | — | kept the edition carrying more GE attributes |
| ASIA 083 PO | The Great Books of China | AREA_3 | — | kept the edition carrying more GE attributes |
| ENGL 170P PO | James Joyce & | AREA_1 | — | kept the edition carrying more GE attributes |
| ENGL 044 PO | Cont. Indigenous Writers | AREA_1 | — | kept the edition carrying more GE attributes |
| FREN 107 PO | Francophone Futurity | AREA_1, ANALYZING_DIFFERENCE, SPEAKING_INTENSIVE, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| GWS 081 PO | Transformative Justice | — | — | kept the edition with more catalog detail |
| ENGL 169 PO | Q/TOC Critique & Latinx Lit | AREA_1, ANALYZING_DIFFERENCE | — | kept the edition carrying more GE attributes |
| ARHI 127 PO | Ottoman Art and Architecture | — | — | editions are equivalent; kept one deterministically |
| ART 123 PO | Mending: Practical & Symbolic | — | — | kept the edition with more catalog detail |
| ECON 123 PO | International Economics | AREA_2 | — | kept the edition carrying more GE attributes |
| MATH 142 PO | Differential Geometry | AREA_5 | — | kept the edition carrying more GE attributes |
| GEOL 131 PO | Volcanology w/Lab | AREA_4 | — | kept the edition carrying more GE attributes |
| DANC 173 PO | Alexander Technique - Individual | AREA_6 | — | kept the edition carrying more GE attributes |
| DANC 174 PO | Alexander Technique - Group | AREA_6, PHYSICAL_EDUCATION | — | kept the edition carrying more GE attributes |
| PSYC 158 PO | Intro Stats for Psych w/ lab | AREA_5 | — | kept the edition carrying more GE attributes |
| POLI 030 PO | U.S. Congress | AREA_2 | — | kept the edition carrying more GE attributes |
| POLI 161 PO | Comparative Social Policy | AREA_2, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| POLI 189H PO | Politics of Poverty | AREA_2 | — | kept the edition carrying more GE attributes |
| PSYC 143 PO | Soc Cog Affective Neurosc w/lab | AREA_2 | — | kept the edition carrying more GE attributes |
| PSYC 163 PO | Emotion & Motivation with Lab | AREA_2 | — | kept the edition carrying more GE attributes |
| MUS 062 PO | Surv Am Mus: Harlem Renaissance | AREA_1 | — | kept the edition carrying more GE attributes |
| PSYC 180F PO | Seminar in Forensic Psychology | AREA_2 | — | kept the edition carrying more GE attributes |
| PSYC 189Q PO | Qualitative Methods | AREA_2, SPEAKING_INTENSIVE | — | kept the edition carrying more GE attributes |
| PSYC 180S PO | Seminar in Group Dynamics | AREA_2, SPEAKING_INTENSIVE, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| RLST 189C PO | African-American Religion | AREA_3 | — | kept the edition carrying more GE attributes |
| RLST 189N PO | Leadership, Authority, Protest | AREA_3 | — | kept the edition carrying more GE attributes |
| SOC 189Z PO | Sociology of (Non)Citizenship | AREA_2 | — | kept the edition carrying more GE attributes |
| ENGL 170X PO | Asian Am Lit & Cultural Critique | AREA_1 | — | kept the edition carrying more GE attributes |
| ENGL 188 PO | American Literature After 1945 | AREA_1 | — | kept the edition carrying more GE attributes |
| CSCI 181R PO | Mobile Robotics | — | — | kept the edition with more catalog detail |
| ASIA 081 PO | A Culinary History of China | AREA_3, SPEAKING_INTENSIVE | — | kept the edition carrying more GE attributes |
| CLAS 103 PO | Medieval Latin Translation | LANGUAGE | — | kept the edition carrying more GE attributes |
| CHIN 055 PO | Social Issues in China Today | SPEAKING_INTENSIVE | — | kept the edition carrying more GE attributes |
| LGCS 117 PO | Writing Systems | AREA_2 | — | kept the edition carrying more GE attributes |
| MS 085 PO | Dialectical Image | AREA_1 | — | kept the edition carrying more GE attributes |
| MUS 068 PO | American Roots Music | AREA_1, ANALYZING_DIFFERENCE | — | kept the edition carrying more GE attributes |
| THEA 084 PO | Projection/Media Design for Thea | AREA_6 | AREA_6 | kept the edition with more catalog detail |
| THEA 030 PO | World Theatre and Drama 1 | AREA_1 | AREA_1 | editions are equivalent; kept one deterministically |
| ARHI 137 PO | History & Ethics of Collecting | AREA_1 | — | kept the edition carrying more GE attributes |
| ART 082 PO | Art of Persuasion | — | — | kept the edition with more catalog detail |
| CHIN 123 PO | Chinese Culture and Arts | LANGUAGE | — | kept the edition carrying more GE attributes |
| ENGL 019 PO | Intro to Asian Am Lit | AREA_1, ANALYZING_DIFFERENCE | — | kept the edition carrying more GE attributes |
| HIST 101Q PO | Writing Stories About The Body | AREA_3, SPEAKING_INTENSIVE, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| ANTH 077 PO | The Unseen & The Unknown | AREA_2 | — | kept the edition carrying more GE attributes |
| ANTH 104 PO | Linguistic Anthropology | AREA_2, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| ARHI 131 PO | US-Mexico Border Art | AREA_1, ANALYZING_DIFFERENCE | — | kept the edition carrying more GE attributes |
| ASAM 142 PO | South Asian American Studies | AREA_3, ANALYZING_DIFFERENCE | — | kept the edition carrying more GE attributes |
| ARHI 130 PO | Modern Latinx American Art | AREA_1 | — | kept the edition carrying more GE attributes |
| THEA 141 PO | Dramaturgy | AREA_6 | AREA_6 | editions are equivalent; kept one deterministically |
| THEA 054C PO | The Speaking Voice | AREA_6 | AREA_6 | kept the edition with more catalog detail |
| ANTH 015 PO | Data and Society | AREA_2 | — | kept the edition carrying more GE attributes |
| CSCI 140 PO | Algorithms | AREA_5 | AREA_5 | kept the edition with more catalog detail |
| CHST 028 CH | Intro Contemp Central America II | AREA_3, SPEAKING_INTENSIVE | AREA_3, SPEAKING_INTENSIVE | editions are equivalent; kept one deterministically |
| CHST 128 CH | Latinx Citizenship | AREA_3, SPEAKING_INTENSIVE | AREA_3, SPEAKING_INTENSIVE | editions are equivalent; kept one deterministically |
| CHST 132 CH | Immigration and Activism | AREA_3, COMMUNITY_PARTNERSHIP, SPEAKING_INTENSIVE | AREA_3, COMMUNITY_PARTNERSHIP, SPEAKING_INTENSIVE | editions are equivalent; kept one deterministically |
| BIOL 190 PO | Biology Senior Seminar | — | — | kept the edition with more catalog detail |
| ECON 163 PO | International Macroeconomics | AREA_2 | AREA_2 | kept the edition with more catalog detail |
| ECON 152 PO | Money, Banking & Fin Markets | AREA_2 | AREA_2 | kept the edition with more catalog detail |
| ANTH 191 PO | Senior Thesis | — | — | kept the edition with more catalog detail |
| ARHI 140 PO | Contemporary Arts of Africa | AREA_1 | AREA_1 | kept the edition with more catalog detail |
| CHEM 001BL PO | Lab, General Chemistry | — | — | editions are equivalent; kept one deterministically |
| ARHI 141M PO | Rep Blackness Music/Masculinity | AREA_1 | AREA_1 | kept the edition with more catalog detail |
| CLAS 022 PO | Introductory Latin Accelerated | AREA_1, SPEAKING_INTENSIVE | — | kept the edition carrying more GE attributes |
| JAPN 199DR PO | Japanese: Directed Readings | — | — | editions are equivalent; kept one deterministically |
| JAPN 199IR PO | Japanese: Indep Research Project | — | — | kept the edition with more catalog detail |
| CLAS 044 PO | Advanced Latin Readings | AREA_1, LANGUAGE | AREA_1, LANGUAGE | kept the edition with more catalog detail |
| HIST 118 PO | Native American History | AREA_3 | AREA_3 | editions are equivalent; kept one deterministically |
| GEOL 189I PO | Isotopes in Earth Sciences | — | — | editions are equivalent; kept one deterministically |
| FREN 185 PO | The Art of Modern Fiction | AREA_1, LANGUAGE | AREA_1, LANGUAGE | kept the edition with more catalog detail |
| GEOL 143 PO | Geology of Natural Resources | AREA_4 | AREA_4 | editions are equivalent; kept one deterministically |
| CLAS 033 PO | Intermediate Greek | LANGUAGE | LANGUAGE | kept the edition with more catalog detail |
| GEOL 189G PO | GIS for Geologists | AREA_4 | AREA_4 | editions are equivalent; kept one deterministically |
| GERM 191 PO | Senior Thesis in German | — | — | kept the edition with more catalog detail |
| ENGL 170R PO | Testamentary Fictions | AREA_1, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | editions are equivalent; kept one deterministically |
| ENGL 170J PO | The Works of Toni Morrison | AREA_1 | AREA_1 | editions are equivalent; kept one deterministically |
| ENGL 170A PO | Anglo-Am Literary Modernism | — | — | editions are equivalent; kept one deterministically |
| HIST 101H PO | American History, 1500-1900 | AREA_3 | AREA_3 | editions are equivalent; kept one deterministically |
| GERM 102 PO | Intro to German Literature | AREA_1, LANGUAGE | AREA_1, LANGUAGE | kept the edition with more catalog detail |
| GWS 183 PO | Transnational Feminist Theories | AREA_3 | AREA_3 | editions are equivalent; kept one deterministically |
| CHEM 001A PO | General Chemistry w/Laboratory | AREA_4 | — | kept the edition carrying more GE attributes |
| HIST 121 PO | Early America | AREA_3 | AREA_3 | editions are equivalent; kept one deterministically |
| GEOL 020E PO | Oceanography | AREA_4 | AREA_4 | editions are equivalent; kept one deterministically |
| GWS 170 PO | Disability Studies | AREA_3, ANALYZING_DIFFERENCE | AREA_3, ANALYZING_DIFFERENCE | editions are equivalent; kept one deterministically |
| GERM 154H PO | Contemporary German Fiction | LANGUAGE, WRITING_INTENSIVE | — | kept the edition carrying more GE attributes |
| CLAS 022 PO | Intro Classical Greek Accel | AREA_1, SPEAKING_INTENSIVE | — | kept the edition carrying more GE attributes |
| GRMT 164 PO | Changing Worlds of Work | AREA_1 | AREA_1 | editions are equivalent; kept one deterministically |
