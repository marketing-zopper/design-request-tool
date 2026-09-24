-- Optional starter stakeholders so the app is usable immediately after setup.
-- Edit freely, or manage stakeholders directly in the Supabase table editor.

insert into stakeholders (name, email, active)
values
  ('Aditi Sharma', 'aditi.sharma@example.com', true),
  ('Rahul Mehta', 'rahul.mehta@example.com', true),
  ('Priya Nair', 'priya.nair@example.com', true)
on conflict do nothing;
