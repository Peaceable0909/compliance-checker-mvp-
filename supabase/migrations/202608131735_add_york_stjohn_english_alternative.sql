update public.countries
set requirements = requirements || jsonb_build_object(
  'requiredDocumentAlternatives', jsonb_build_array(jsonb_build_array(
    '4b850204-1fdf-4e47-aa54-d22f9c7739b1',
    'b11b0c4d-a8da-4365-a18e-fe4a7c809cff',
    '64d60d7e-d9be-4a00-b1e0-fc6abe2c1a8d',
    'a4fd859b-07a6-4c61-97cd-e27ca9d911fb'
  ))
)
where id = 'b22644a0-983f-4928-aa7f-7db0917f1a71';
