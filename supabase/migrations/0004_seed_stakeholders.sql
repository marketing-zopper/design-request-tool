-- Optional starter stakeholders so the app is usable immediately after setup.
-- Edit freely, or manage stakeholders directly in the Supabase table editor.

insert into stakeholders (name, email, active)
values
  ('Ketan Patil', 'ketan.patil@zopper.com', true)
on conflict do nothing;
