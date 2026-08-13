-- Source-backed York St John University requirements.
-- Official sources reviewed 2026-08-13:
-- https://www.yorksj.ac.uk/international/how-to-apply/entry-requirements-for-your-country-or-region/
-- https://www.yorksj.ac.uk/international/how-to-apply/apply-direct/
-- https://www.yorksj.ac.uk/international/how-to-apply/english-language-requirements/
-- https://www.yorksj.ac.uk/international/international-offer-holders/preparing-for-cas/
-- https://www.yorksj.ac.uk/courses/undergraduate/nursing/nursing-adult-bsc-hons/

update public.countries
set requirements = coalesce(requirements, '{}'::jsonb) || jsonb_build_object(
  'provider', 'York St John University',
  'sourceReference', 'https://www.yorksj.ac.uk/international/how-to-apply/entry-requirements-for-your-country-or-region/',
  'academicRequirements', jsonb_build_object(
    'foundation', jsonb_build_object('waecMinimumCreditPasses', 5, 'waecMinimumGrade', 'C6', 'umeMinimumScore', 350),
    'undergraduate', jsonb_build_object('year1AtRecognisedNigerianUniversity', true, 'minimumGpa', 2.6, 'ondNdMinimumResult', 'Lower Credit', 'recognisedInternationalFoundation', 'Pass all modules'),
    'postgraduate', jsonb_build_object('bachelorFromRecognisedUniversity', true, 'courseDependentGradeRange', '50 to 70 or Second Class (lower credit) to First Class')
  ),
  'englishRequirements', jsonb_build_object(
    'undergraduate', jsonb_build_object('acceptedDocumentTypes', jsonb_build_array('WAEC Certificate', 'NECO Certificate'), 'minimumGrade', 'C6', 'minimumExamYear', 2005, 'verificationMayBeRequested', true),
    'postgraduate', jsonb_build_object('acceptedDocumentTypes', jsonb_build_array('WAEC Certificate', 'NECO Certificate', 'IELTS'), 'minimumGrade', 'C6 or IELTS 6.0 with no component below 5.5', 'verificationMayBeRequested', true)
  ),
  'notes', 'York St John does not accept qualifications obtained in the Republic of Benin. Some postgraduate courses require a related subject; check the individual course page.'
)
where id = 'b22644a0-983f-4928-aa7f-7db0917f1a71';

update public.universities
set requirements = coalesce(requirements, '{}'::jsonb) || jsonb_build_object(
  'provider', 'York St John University',
  'sourceReference', 'https://www.yorksj.ac.uk/international/how-to-apply/apply-direct/',
  'requiredDocumentTypes', jsonb_build_array(
    'c2c76f67-7c05-4b30-871f-1f4624783bad',
    '4ea41442-7a66-433e-808b-d070496eaa03',
    '8c31f0c3-13ef-480a-a35f-a1d48b0e9868',
    '2721fec7-821f-44b7-b3bb-3124a1dc0d7f',
    '73931c96-6ed8-4daa-8c20-d64af3bcb070'
  ),
  'englishEvidenceAlternatives', jsonb_build_array(
    '64d60d7e-d9be-4a00-b1e0-fc6abe2c1a8d',
    'a4fd859b-07a6-4c61-97cd-e27ca9d911fb',
    '4b850204-1fdf-4e47-aa54-d22f9c7739b1',
    'b11b0c4d-a8da-4365-a18e-fe4a7c809cff'
  ),
  'generalEnglish', jsonb_build_object('ieltsOverall', 6.0, 'ieltsMinimumComponent', 5.5),
  'notes', 'Direct applications require a personal statement, official qualifications/certificates and transcripts with English translation where necessary, English evidence, signed dated stamped academic references on official letterhead, passport photo page and previous UK visas, and CV.'
)
where id = 'abc6a6f4-d38d-4bd4-b0db-3ca6aa1f22d6';

update public.programmes
set requirements = coalesce(requirements, '{}'::jsonb) || jsonb_build_object(
  'provider', 'York St John University',
  'sourceReference', 'https://www.yorksj.ac.uk/courses/undergraduate/nursing/nursing-adult-bsc-hons/',
  'minIeltsScore', 6.0,
  'minEnglishComponentScore', 5.5,
  'academicRequirements', jsonb_build_object('ucasTariffPoints', 112, 'requiredEquivalentSubjects', jsonb_build_array('English Language', 'Mathematics', 'Science'), 'functionalSkillsAcceptedAsEquivalencies', true),
  'notes', 'Programme page states 112 UCAS Tariff points plus three GCSEs at grade C/4 or equivalent including English Language, Mathematics and a Science. Individual country equivalence must be confirmed against York St John country guidance.'
)
where id = 'e61ea5c8-751d-4a15-b8d4-e5505faf436f';
