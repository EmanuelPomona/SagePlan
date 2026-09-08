# Coursedog vs Registrar — GE attribute divergences

**257** Pomona course(s) disagree between the two sources.
Threshold: warn from 1, fail above 25 (`PIPELINE_MAX_DIVERGENCES`).

## How to resolve

Neither source is authoritative and the pipeline never picks one. Coursedog is
the live catalog; the Registrar export is a dated snapshot used only to validate.
For each row, decide which record is right, fix it upstream, and write the reason
in the Explanation column so the next run's diff is smaller. A row that is
expected (for example a course retagged after the export was taken) can stay
here with its explanation.

| Course | Title | Coursedog | Registrar | Note | Explanation |
|---|---|---|---|---|---|
| AMST 103 PO | Intro to American Cultures | — | AREA_3 | attribute sets differ | |
| ANTH 080 PO | The Horror of Everyday Life | — | AREA_2 | attribute sets differ | |
| ANTH 105 PO | Mthds in Anthropological Inquiry | AREA_2, SPEAKING_INTENSIVE | AREA_2 | attribute sets differ | |
| ANTH 107 PO | Medical Anthropology | ANALYZING_DIFFERENCE, AREA_2 | ANALYZING_DIFFERENCE, AREA_2, SPEAKING_INTENSIVE | attribute sets differ | |
| ANTH 136 PO | Anthropology of/and Capitalism | — | AREA_2 | attribute sets differ | |
| ANTH 184 PO | Migration in the Middle East | — | AREA_2 | attribute sets differ | |
| ARHI 001 PO | Introduction to Art History | — | AREA_1 | attribute sets differ | |
| ARHI 114 PO | Print Cultures: Hist and Theory | — | AREA_1 | attribute sets differ | |
| ARHI 126 PO | South Asian Painting | — | AREA_1 | attribute sets differ | |
| ARHI 127 PO | Ottoman Art and Architecture | — | AREA_1, SPEAKING_INTENSIVE | attribute sets differ | |
| ARHI 139 PO | Native American Women Artists | — | AREA_1 | attribute sets differ | |
| ARHI 171 PO | Architect, Medieval to Modern | AREA_1 | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ARHI 186P PO | Art and Pilgrimage | — | AREA_1 | attribute sets differ | |
| ARHI 186U PO | The Art of the Uncanny | — | AREA_1 | attribute sets differ | |
| ARHI 186Y PO | Cinema Against War | — | AREA_1 | attribute sets differ | |
| ART 024 PO | Photography: Process and Percept | — | AREA_6 | attribute sets differ | |
| ART 026 PO | Knitting: Texts & Textiles | — | AREA_6 | attribute sets differ | |
| ART 027A PO | The Chair: An Introduction | — | AREA_6 | attribute sets differ | |
| ART 082 PO | The Art of Advocacy | — | AREA_6 | attribute sets differ | |
| ART 110 PO | More Painting | — | AREA_6 | attribute sets differ | |
| ART 117 PO | The Delights of Mail Art | — | AREA_6 | attribute sets differ | |
| ART 123 PO | Mending: Practical & Symbolic | — | AREA_6 | attribute sets differ | |
| ART 126D PO | Casting: The Unfashionable | — | AREA_6 | attribute sets differ | |
| ART 127 PO | The Chair | AREA_6 | — | missing from Registrar export | |
| ART 140 PO | Metal Casting | — | AREA_6 | attribute sets differ | |
| ART 177 PO | Rethinking Painting | — | AREA_6 | attribute sets differ | |
| ASAM 070 PO | Surveillance | — | AREA_3 | attribute sets differ | |
| ASAM 086 PO | Social Documentation/Asian Amer | ANALYZING_DIFFERENCE, AREA_3 | — | missing from Registrar export | |
| ASIA 080 PO | The One Source Of All Things | AREA_3 | — | missing from Registrar export | |
| ASIA 081 PO | A Chinese Culinary History | AREA_3, SPEAKING_INTENSIVE | — | missing from Registrar export | |
| ASIA 082 PO | Confucius and his interpreters | AREA_3, SPEAKING_INTENSIVE | — | missing from Registrar export | |
| ASIA 083 PO | The Great Books of China | AREA_3 | — | missing from Registrar export | |
| ASIA 084 PO | Thinking in Early China | — | AREA_3 | attribute sets differ | |
| ASIA 085 PO | Antiquarianism in East Asian Art | — | AREA_3 | attribute sets differ | |
| ASIA 086 PO | Human and Heavenly Bodies | — | AREA_3 | attribute sets differ | |
| ASTR 062 PO | Introduction to Astrophysics | AREA_4 | — | missing from Registrar export | |
| BIOL 001A PO | Human Genetics for Non-Majors | AREA_4 | — | missing from Registrar export | |
| BIOL 047 PO | Being Human in STEM | ANALYZING_DIFFERENCE, AREA_4 | ANALYZING_DIFFERENCE | attribute sets differ | |
| BIOL 104A PO | Sem in Conserving Biodiversity | — | AREA_4, SPEAKING_INTENSIVE | attribute sets differ | |
| BIOL 108 PO | Data Science For Conserv Biology | — | AREA_4, WRITING_INTENSIVE | attribute sets differ | |
| BIOL 131 PO | Invertebrate Biology w/ Lab | AREA_4 | — | missing from Registrar export | |
| BIOL 133 PO | Conservation in a Changing World | — | AREA_4 | attribute sets differ | |
| BIOL 165A PO | Molecular Genetics of Cancer | AREA_4, SPEAKING_INTENSIVE | — | missing from Registrar export | |
| BIOL 173 PO | Genomics & Bioinformatics w/Lab | AREA_4, SPEAKING_INTENSIVE | AREA_4 | attribute sets differ | |
| BIOL 189J PO | Research Mthd Neurolog Disease | AREA_4 | — | missing from Registrar export | |
| CHEM 150 PO | Adv. Synthesis Lab | AREA_4 | — | missing from Registrar export | |
| CHEM 151 PO | Adv Chem and Biochem Kinetics | — | AREA_4 | attribute sets differ | |
| CHEM 165 PO | Adv. Biochemistry Lab | AREA_4 | — | missing from Registrar export | |
| CHEM 187 PO | Polymer Chemistry | — | AREA_4 | attribute sets differ | |
| CHIN 124 PO | Cultural Landscapes of China | — | AREA_1 | attribute sets differ | |
| CHIN 129 PO | International Interethnic China | — | LANGUAGE | attribute sets differ | |
| CHNT 166 PO | Chinese Fiction, Old and New | AREA_1, WRITING_INTENSIVE | — | missing from Registrar export | |
| CHNT 180 PO | Craft of Translation | AREA_1, WRITING_INTENSIVE | — | missing from Registrar export | |
| CHST 081 PO | Technofuturos: Latinxs and Tech | — | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| CHST 102 PO | Latinx Urbanism: Voices from LA | — | AREA_3 | attribute sets differ | |
| CHST 124 PO | Community Organizing in the US | — | AREA_3 | attribute sets differ | |
| CLAS 012 PO | Greek Tragedy | AREA_1 | — | missing from Registrar export | |
| CLAS 033 PO | Intermediate Latin | LANGUAGE | — | missing from Registrar export | |
| CLAS 044 PO | Advanced Greek Readings | AREA_1, LANGUAGE | — | missing from Registrar export | |
| CLAS 103 PO | Medieval Latin Translation | LANGUAGE | — | missing from Registrar export | |
| CLAS 104 PO | Readings in Koine Greek | LANGUAGE | — | missing from Registrar export | |
| CLAS 112 PO | Gender & Sex in Ancient Rome | AREA_1, LANGUAGE, WRITING_INTENSIVE | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| CSCI 051 PO | Introduction to Computer Science | — | AREA_5 | attribute sets differ | |
| CSCI 122 PO | Computational Design Tools | — | AREA_5 | attribute sets differ | |
| CSCI 138 PO | System Security | — | AREA_5 | attribute sets differ | |
| CSCI 181AA PO | Advanced Algorithms | — | AREA_5 | attribute sets differ | |
| CSCI 181CA PO | Computer Architecture | — | AREA_5 | attribute sets differ | |
| CSCI 181DT PO | Computational Design Tools | — | AREA_5 | attribute sets differ | |
| CSCI 181DV PO | Advanced Data Visualization | — | AREA_5 | attribute sets differ | |
| CSCI 181NW PO | Intro to Computer Networks | — | AREA_5 | attribute sets differ | |
| CSCI 181R PO | Mobile Robotics | — | AREA_5 | attribute sets differ | |
| CSCI 181RT PO | Real-Time Sys. in the Real World | — | AREA_5 | attribute sets differ | |
| DANC 137 PO | Performing Art: Sexuality/Gender | AREA_1 | — | missing from Registrar export | |
| DANC 182 PO | Dance Production Practicum | — | AREA_6 | attribute sets differ | |
| DANC 189 PO | Movement in the Weimar Republic | — | AREA_1 | attribute sets differ | |
| EA 042 PO | Biomimicry Design Innovation | — | AREA_2 | attribute sets differ | |
| EA 062 PO | Political Animals, Animal Ethics | — | AREA_2 | attribute sets differ | |
| EA 189G PO | Energy History and Justice | — | AREA_2 | attribute sets differ | |
| EA 190 PO | Environmental Seminar CP | COMMUNITY_PARTNERSHIP, SPEAKING_INTENSIVE | SPEAKING_INTENSIVE | attribute sets differ | |
| ECON 131 PO | Economics of Entrepreneurship CP | ANALYZING_DIFFERENCE, AREA_2, COMMUNITY_PARTNERSHIP | ANALYZING_DIFFERENCE, AREA_2 | attribute sets differ | |
| ECON 143 PO | Economics and Film | — | AREA_2 | attribute sets differ | |
| ECON 144 PO | Historia Econmica de Mxico | — | AREA_2 | attribute sets differ | |
| ECON 178 PO | Advanced Microeconomic Topics | — | AREA_2 | attribute sets differ | |
| ENGL 010 PO | Introduction to Close Reading | AREA_1 | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 017 PO | Intro to Chicanx/a/o Literature | AREA_1, WRITING_INTENSIVE | ANALYZING_DIFFERENCE, AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 024 PO | Caribbean American Women Writers | AREA_1 | — | missing from Registrar export | |
| ENGL 029 PO | American Misfits: Short Stories | — | AREA_1 | attribute sets differ | |
| ENGL 040 PO | Kubrick and Authorship | — | AREA_1 | attribute sets differ | |
| ENGL 041 PO | Modern British and Irish Fiction | — | AREA_1 | attribute sets differ | |
| ENGL 043 PO | Families in Asian Diasporic Lit | — | AREA_1 | attribute sets differ | |
| ENGL 046 PO | Enlight, Romantic, & Vict Lit | — | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 049 PO | The Gothic | AREA_1 | — | missing from Registrar export | |
| ENGL 050 PO | Modern British & Irish Fiction | AREA_1 | — | missing from Registrar export | |
| ENGL 064D PO | Intro to Creative Writing | AREA_6 | AREA_6, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 081 PO | AI and I | — | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 091 PO | Englightnmnt,Romantic,Victrn Lit | AREA_1, SPEAKING_INTENSIVE | — | missing from Registrar export | |
| ENGL 095 PO | Latinx Speculative Fictions | — | ANALYZING_DIFFERENCE, AREA_1 | attribute sets differ | |
| ENGL 096 PO | Transpacific Bodies/Materials | — | AREA_1 | attribute sets differ | |
| ENGL 157 PO | Diaries and Daybooks | — | AREA_6, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 161 PO | James Joyce | AREA_1, WRITING_INTENSIVE | AREA_1 | attribute sets differ | |
| ENGL 163 PO | Feminist Avant-Garde Writing | — | ANALYZING_DIFFERENCE, AREA_1 | attribute sets differ | |
| ENGL 170A PO | Anglo-Am Literary Modernism | — | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 170H PO | Latinx Lit & Cultural Critique | — | ANALYZING_DIFFERENCE, AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 170J PO | The Works of Toni Morrison | AREA_1 | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 170R PO | Testamentary Fictions | AREA_1, WRITING_INTENSIVE | AREA_1, SPEAKING_INTENSIVE, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 170U PO | The Faerie Queene | — | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| ENGL 170X PO | Asian Am Lit & Cultural Critique | AREA_1 | ANALYZING_DIFFERENCE, AREA_1 | attribute sets differ | |
| ENGL 170Y PO | Metaphysical Poets | AREA_1, WRITING_INTENSIVE | — | missing from Registrar export | |
| FREN 101 PO | From Page to Paris | AREA_1, LANGUAGE, SPEAKING_INTENSIVE, WRITING_INTENSIVE | AREA_1, SPEAKING_INTENSIVE, WRITING_INTENSIVE | attribute sets differ | |
| FREN 101A PO | Intro to Literary Analysis | AREA_1, LANGUAGE, SPEAKING_INTENSIVE | — | missing from Registrar export | |
| FREN 102 PO | Media in Contemporary France | — | AREA_1 | attribute sets differ | |
| FREN 104 PO | A Journey through French Fashion | — | AREA_1 | attribute sets differ | |
| FREN 112 PO | Queer Coming of Age | — | AREA_1 | attribute sets differ | |
| FREN 126 PO | France and Japan, 1700–1960 | — | AREA_1 | attribute sets differ | |
| FREN 152 PO | Literature as Resistance | AREA_1, LANGUAGE | — | missing from Registrar export | |
| FREN 173 PO | Reading Bodies | AREA_1, LANGUAGE | — | missing from Registrar export | |
| FREN 174 PO | Adultery in the Novel | AREA_1, LANGUAGE, WRITING_INTENSIVE | — | missing from Registrar export | |
| FREN 175 PO | Writing the Exotic | AREA_1, LANGUAGE, WRITING_INTENSIVE | — | missing from Registrar export | |
| FREN 180 PO | Sport and the Francophone Arena | — | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| FREN 184 PO | AI & Proust | — | AREA_1 | attribute sets differ | |
| GEOL 025 PO | Intro to California Geology | — | AREA_4 | attribute sets differ | |
| GEOL 111 PO | GIS for Geologists | — | AREA_4 | attribute sets differ | |
| GEOL 143 PO | Geology of Natural Resources | AREA_4 | AREA_4, SPEAKING_INTENSIVE | attribute sets differ | |
| GEOL 177 PO | Chemical Oceanography | — | AREA_4 | attribute sets differ | |
| GEOL 179 PO | Isotopes in Earth Sciences | — | AREA_4 | attribute sets differ | |
| GRMT 147A PO | German Cinema and Media | — | AREA_1 | attribute sets differ | |
| GRMT 164 PO | Changing Worlds of Work | AREA_1 | AREA_1, SPEAKING_INTENSIVE | attribute sets differ | |
| GWS 036 PO | Introduction to Queer Studies | — | AREA_3 | attribute sets differ | |
| GWS 081 PO | Healing Justice and Care Praxis | — | AREA_3 | attribute sets differ | |
| GWS 113 PO | History of Sexuality | — | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| GWS 166 PO | Witchcraft | AREA_3 | AREA_3, SPEAKING_INTENSIVE | attribute sets differ | |
| GWS 170 PO | Disability Studies | ANALYZING_DIFFERENCE, AREA_3 | ANALYZING_DIFFERENCE, AREA_3, SPEAKING_INTENSIVE | attribute sets differ | |
| GWS 183 PO | Transnational Feminist Theories | AREA_3 | AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 037 PO | Pirates of the Caribbean | — | AREA_3 | attribute sets differ | |
| HIST 061 PO | History of East Asia to 1650 | — | AREA_3 | attribute sets differ | |
| HIST 064 PO | War & Culture in Premodern China | — | AREA_3 | attribute sets differ | |
| HIST 101AD PO | Age of Conquest and Continuity | — | AREA_3 | attribute sets differ | |
| HIST 101B PO | U.S. West Uncovered | — | ANALYZING_DIFFERENCE, AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 101EJ PO | Early Modern Japan | — | AREA_3 | attribute sets differ | |
| HIST 101H PO | American History, 1500-1900 | AREA_3 | AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 101N PO | Intermediaries in East Asia | — | AREA_3 | attribute sets differ | |
| HIST 101Y PO | Decolonization of Euro Empires | — | AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 118 PO | Native American History | AREA_3 | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| HIST 121 PO | Early America | AREA_3 | AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 129 PO | The Seventies | — | AREA_3 | attribute sets differ | |
| HIST 131 PO | History and Immigration Law (CP) | AREA_3, COMMUNITY_PARTNERSHIP | AREA_3 | attribute sets differ | |
| HIST 136 PO | Afro-Latin America | ANALYZING_DIFFERENCE, AREA_3, COMMUNITY_PARTNERSHIP, WRITING_INTENSIVE | ANALYZING_DIFFERENCE, AREA_3, WRITING_INTENSIVE | attribute sets differ | |
| HIST 160 PO | Monsters and Modernity | — | AREA_3 | attribute sets differ | |
| HIST 169 PO | Ghosts and Gods in Japan | — | AREA_3 | attribute sets differ | |
| HIST 170 PO | Early Modern Russia | — | AREA_3 | attribute sets differ | |
| HIST 171 PO | Scandinavian History to 1800 | — | AREA_3 | attribute sets differ | |
| HIST 177 PO | Russian Alaska | — | AREA_3 | attribute sets differ | |
| HIST 180 PO | Decolonization European Empires | AREA_3 | — | missing from Registrar export | |
| HIST 185 PO | Imperial Cartographies | — | AREA_3 | attribute sets differ | |
| ID 199CP PO | Community Partnerships | COMMUNITY_PARTNERSHIP | — | missing from Registrar export | |
| LAST 180 PO | Gender and Dev in Latin Amer | ANALYZING_DIFFERENCE, AREA_3 | — | missing from Registrar export | |
| LAST 184 PO | Citizen Participation in Lat Am | — | AREA_3 | attribute sets differ | |
| LGCS 113 PO | Contact Languages | — | AREA_2 | attribute sets differ | |
| LGCS 118 PO | Morphosyntax | AREA_2, SPEAKING_INTENSIVE, WRITING_INTENSIVE | AREA_2, SPEAKING_INTENSIVE | attribute sets differ | |
| LGCS 124 PO | Corpus Linguistics | AREA_2 | — | missing from Registrar export | |
| LGCS 129 PO | Computational Linguistics | AREA_2 | — | missing from Registrar export | |
| LGCS 133 PO | Neurolinguistics | — | AREA_2 | attribute sets differ | |
| LGCS 175 PO | Topics in Morphosyntax | — | AREA_2 | attribute sets differ | |
| LGCS 181 PO | Topics in Quantitative Ling | AREA_2 | — | missing from Registrar export | |
| LGCS 186 PO | Investigating Child Language | AREA_2 | — | missing from Registrar export | |
| MATH 061 PO | Computation & Experiment Math | — | AREA_5 | attribute sets differ | |
| MATH 183 PO | Mathematical Modeling (CP) | AREA_5, COMMUNITY_PARTNERSHIP | AREA_5 | attribute sets differ | |
| MATH 185 PO | Methods in Modern Modeling | — | AREA_5 | attribute sets differ | |
| MS 044 PO | Media and Transitional Justice | — | AREA_1 | attribute sets differ | |
| MS 052 PO | Global Europe | — | AREA_1 | attribute sets differ | |
| MS 075 PO | Critical Theory and Pop Cult | — | AREA_1 | attribute sets differ | |
| MS 102 PO | Cinematography | — | AREA_1 | attribute sets differ | |
| MS 127 PO | Media, Art, and the Nonhuman | — | AREA_1 | attribute sets differ | |
| MS 135 PO | Romantic Comedy | — | AREA_1 | attribute sets differ | |
| MS 148A PO | Surveillance and the Media | — | AREA_1 | attribute sets differ | |
| MS 148H PO | Media and Nationalism | — | AREA_1 | attribute sets differ | |
| MUS 040 PO | Chamber Music | AREA_6 | — | attribute sets differ | |
| MUS 040P PO | Chamber Music | AREA_6 | — | missing from Registrar export | |
| MUS 047 PO | Music in Dialog | — | AREA_1, SPEAKING_INTENSIVE | attribute sets differ | |
| MUS 092 PO | Linguistic Elements of Music | — | AREA_1 | attribute sets differ | |
| MUS 094 PO | Scoring for Media | — | AREA_1 | attribute sets differ | |
| MUS 098 PO | Musical Storytelling | — | AREA_6 | attribute sets differ | |
| MUS 140 PO | Chamber Music | AREA_6 | — | attribute sets differ | |
| NEUR 042 PO | Seeing & Believing | — | AREA_4 | attribute sets differ | |
| NEUR 122 PO | Coding the Brain | — | AREA_4 | attribute sets differ | |
| NEUR 130 PO | Vertebrate Sensory Systems w/Lab | AREA_4 | — | missing from Registrar export | |
| NEUR 151 PO | Neural Computation | — | AREA_4 | attribute sets differ | |
| NEUR 157 PO | Stats for Neuroscience | — | AREA_5 | attribute sets differ | |
| NEUR 180W PO | Biol Basis of Psychopathology | — | AREA_4, SPEAKING_INTENSIVE, WRITING_INTENSIVE | attribute sets differ | |
| PE 016C PO | Weight-Training- Advanced | — | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 021 PO | Injury Prevention & Flexibility | — | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 030 PO | Line Dancing | — | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 061A PO | Cycling & Strength | — | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 077E PO | Community Engagement Tennis (CP) | COMMUNITY_PARTNERSHIP, PHYSICAL_EDUCATION | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 080 PO | Community Engagement Sports (CP) | COMMUNITY_PARTNERSHIP, PHYSICAL_EDUCATION | PHYSICAL_EDUCATION | attribute sets differ | |
| PE 199DR PO | Physical Ed: Directed Readings | PHYSICAL_EDUCATION | — | missing from Registrar export | |
| PE 199IR PO | Physical Ed: Indep Research | PHYSICAL_EDUCATION | — | missing from Registrar export | |
| PE 199RA PO | Physical Ed: Research Asstship | PHYSICAL_EDUCATION | — | missing from Registrar export | |
| PHIL 031 PO | Ethical Theory: Historical | — | AREA_3, SPEAKING_INTENSIVE | attribute sets differ | |
| PHIL 038 PO | Medical Ethics | — | AREA_3, SPEAKING_INTENSIVE | attribute sets differ | |
| PHIL 039 PO | Gender, Crime and Punishment(CP) | AREA_3, COMMUNITY_PARTNERSHIP | AREA_3 | attribute sets differ | |
| PHIL 044 PO | Philosophy of Emotion | — | AREA_3 | attribute sets differ | |
| PHIL 046 PO | Feminism and Science (CP) | ANALYZING_DIFFERENCE, AREA_3, COMMUNITY_PARTNERSHIP | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| PHIL 048 PO | Intimate Relationships | — | AREA_3 | attribute sets differ | |
| PHIL 108 PO | Political Animals, Animal Ethics | — | AREA_3 | attribute sets differ | |
| PHIL 163 PO | Advanced Logic | — | AREA_3 | attribute sets differ | |
| PHYS 050 PO | Robotics with a Purpose (CP) | ANALYZING_DIFFERENCE, AREA_4, COMMUNITY_PARTNERSHIP | ANALYZING_DIFFERENCE, AREA_4 | attribute sets differ | |
| PHYS 073 PO | Enhanced Intro Mechanics | — | AREA_4 | attribute sets differ | |
| PHYS 128 PO | Electronics with Laboratory (CP) | AREA_4, COMMUNITY_PARTNERSHIP | AREA_4 | attribute sets differ | |
| POLI 089B PO | Fndn Western Political Thought | — | AREA_2 | attribute sets differ | |
| POLI 124 PO | Contemporary Political Theory | — | AREA_2 | attribute sets differ | |
| POLI 137 PO | Research Design: Pol & Policy | — | AREA_2 | attribute sets differ | |
| POLI 175 PO | DEMOCRACY, HUMAN RIGHTS AND USFP | AREA_2 | — | missing from Registrar export | |
| POLI 181 PO | Ghibli and Foundations Poli Sci | — | AREA_2, WRITING_INTENSIVE | attribute sets differ | |
| POLI 189C PO | Race, Film, and Politics | — | AREA_2 | attribute sets differ | |
| POLI 189D PO | Latino Politics | — | AREA_2 | attribute sets differ | |
| POLI 189J PO | Political Psychology | — | AREA_2 | attribute sets differ | |
| POLI 189K PO | Contemporary Democratic Theory | — | AREA_2 | attribute sets differ | |
| POLI 190B PO | Sr Sem: Comparativ/Intl Politics | SPEAKING_INTENSIVE | — | attribute sets differ | |
| POLI 190C PO | Senior Sem: Contemp Poli/Theory | SPEAKING_INTENSIVE | — | attribute sets differ | |
| POLI 190D PO | Senior Seminar in Politics | SPEAKING_INTENSIVE | — | attribute sets differ | |
| PPA 089 PO | World Class Medical Care | — | AREA_2 | attribute sets differ | |
| PSYC 131A PO | Psych Disorders with Lab | — | AREA_2 | attribute sets differ | |
| PSYC 133 PO | Fldwrk in Clinical Psych (CP) | AREA_2, COMMUNITY_PARTNERSHIP | AREA_2 | attribute sets differ | |
| PSYC 180R PO | Hum Relationships & Development | — | AREA_2 | attribute sets differ | |
| PSYC 189C PO | Cognition and Concepts | — | AREA_2 | attribute sets differ | |
| PSYC 189Z PO | Skepticism and Pseudoscience | — | AREA_2, SPEAKING_INTENSIVE | attribute sets differ | |
| RLST 025 PO | Relig, Punish, Restoration (CP) | ANALYZING_DIFFERENCE, AREA_3, COMMUNITY_PARTNERSHIP | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| RLST 030 PO | Gnosticism | — | AREA_3 | attribute sets differ | |
| RLST 042 PO | The Art of Living | AREA_3 | — | missing from Registrar export | |
| RLST 116 PO | The Lotus Sutra in East Asia | AREA_3 | — | missing from Registrar export | |
| RLST 144 PO | Minorities in Muslim World | — | AREA_3 | attribute sets differ | |
| RLST 145 PO | Islamic Political Thought | — | AREA_3 | attribute sets differ | |
| RLST 160 PO | Maimonides | — | AREA_3 | attribute sets differ | |
| RLST 181 PO | Prison Punishment Redemption(CP) | ANALYZING_DIFFERENCE, AREA_3, COMMUNITY_PARTNERSHIP | ANALYZING_DIFFERENCE, AREA_3 | attribute sets differ | |
| SOC 112 PO | Urban Sociology | — | AREA_2 | attribute sets differ | |
| SOC 123 PO | Social Policy | — | AREA_2 | attribute sets differ | |
| SOC 132 PO | Sociology of Love | — | AREA_2 | attribute sets differ | |
| SOC 138 PO | Sociology of Death and Dying | — | AREA_2 | attribute sets differ | |
| SOC 141 PO | Sociology of Youth and Childhood | — | AREA_2 | attribute sets differ | |
| SOC 144 PO | Family Sociology | — | AREA_2 | attribute sets differ | |
| SOC 169X PO | Sexuality | — | AREA_2 | attribute sets differ | |
| SPAN 147 PO | History of the Spanish Language | — | AREA_1 | attribute sets differ | |
| SPAN 189B PO | Illicit Inscriptions | — | AREA_1 | attribute sets differ | |
| STS 010 PO | Intro to Sci, Tech, and Society | — | AREA_2 | attribute sets differ | |
| STS 179 PO | Media, Technology & Energy | — | AREA_2 | attribute sets differ | |
| THEA 009 PO | Intro to Comedy Improvisation | AREA_6 | — | missing from Registrar export | |
| THEA 022 PO | Lighting Technology | — | AREA_6 | attribute sets differ | |
| THEA 026 PO | CAD: Drafting and Modeling | — | AREA_6 | attribute sets differ | |
| THEA 027 PO | CAD: Rendering | — | AREA_6 | attribute sets differ | |
| THEA 030 PO | World Theatre and Drama 1 | AREA_1 | AREA_1, WRITING_INTENSIVE | attribute sets differ | |
| THEA 052C PO | Theatre Production: Practicum | — | AREA_6 | attribute sets differ | |
| THEA 085 PO | Advanced Lighting Design | — | AREA_1, AREA_6 | attribute sets differ | |
| THEA 089C PO | Movement for Actors and Others | — | AREA_6 | attribute sets differ | |
| THEA 141 PO | Dramaturgy | AREA_6 | AREA_6, SPEAKING_INTENSIVE | attribute sets differ | |
| THEA 142 PO | Intro to Performance Studies | — | AREA_1 | attribute sets differ | |
| THEA 172 PO | Fundamentals of TV Writing | — | AREA_6 | attribute sets differ | |
