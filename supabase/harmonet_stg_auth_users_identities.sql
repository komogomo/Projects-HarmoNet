--
-- PostgreSQL database dump
--

\restrict 0aCyZzUDbIaaQJ2aWdbf2vIDAThttWtHh2JUyu5rP3vYO3YHDUTsVRj93bqA4vC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	0b9b4aa2-3ea3-4526-8caa-91fcd04f36a9	authenticated	authenticated	user03@gmail.com	$2a$10$prOzOwGtX.aLsfV2nidDl..jxj1d6VJNsSWDEKCnBy4LPzg1JapMS	2025-11-28 03:48:37.736219+00	\N		\N		2025-12-06 01:04:07.615553+00			\N	2025-12-06 01:04:10.998467+00	{"provider": "email", "providers": ["email"]}	{"display_name": "User 03", "email_verified": true}	\N	2025-11-28 03:48:37.730901+00	2025-12-06 01:04:11.005621+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	3499e15d-8fc7-44ac-8b78-caa1005b9e34	authenticated	authenticated	user01@gmail.com	$2a$10$7yhppLkACFyzQhQeeVQ02uAjXs1NTwag7WloVboEW9w1I25L.jwO.	2025-11-23 10:58:20.699119+00	\N		\N		2025-12-07 10:22:54.040932+00			\N	2025-12-07 10:22:57.954436+00	{"provider": "email", "providers": ["email"]}	{"sub": "3499e15d-8fc7-44ac-8b78-caa1005b9e34", "email": "user01@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-11-23 10:58:20.678846+00	2025-12-07 10:22:57.958106+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	5f07c32f-1299-4570-9c42-16e96349cf15	authenticated	authenticated	admin@gmail.com	$2a$10$g.v9dJzyXtIKEi1qcIYGAOSPYYdCZYePa0JmvkUkmwASGYcwNX6ae	2025-11-23 10:57:36.010574+00	\N		\N		2025-12-08 05:01:18.895504+00			\N	2025-12-08 05:01:26.053614+00	{"provider": "email", "providers": ["email"]}	{"sub": "5f07c32f-1299-4570-9c42-16e96349cf15", "email": "admin@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-11-23 10:57:35.970774+00	2025-12-08 05:01:26.05714+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	41252088-1762-4311-b665-cb56e3da6c65	authenticated	authenticated	admin02@gmail.com	$2a$10$FdQP5I4TXidI8RGUc9s0TuSCW4.I3lVxkZbWDe01xNktSrlk7NRc2	2025-12-06 06:54:32.331667+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"display_name": "admin02", "email_verified": true}	\N	2025-12-06 06:54:32.323942+00	2025-12-06 06:54:32.332457+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	6800f5c8-7a03-43a7-9830-bb12e9929d03	authenticated	authenticated	marie@gmail.com	$2a$10$PqUOchCWj1tU7nCMIFV3gOyvaFYIAcOqCMZWRoOLXPRfx31Drb0VG	2025-12-02 17:51:06.84735+00	\N		\N		2025-12-06 09:02:56.852018+00			\N	2025-12-06 09:03:00.989767+00	{"provider": "email", "providers": ["email"]}	{"display_name": "TOR001管理組合", "email_verified": true}	\N	2025-12-02 17:51:06.841077+00	2025-12-06 09:03:00.993203+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	43eb1fd3-5d5c-4ae3-8b9a-c921caf32f5d	authenticated	authenticated	admin01@gmail.com	$2a$10$oCeRDZXwpHKtwTuY7WJAbuw7tAWNv7hx/C9CLkxWdGX6lCewKcsfm	2025-11-27 17:43:38.809145+00	\N		\N		2025-12-07 10:04:59.828992+00			\N	2025-12-07 10:05:04.991417+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Admin 01", "email_verified": true}	\N	2025-11-27 17:43:38.797199+00	2025-12-07 10:05:04.994808+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	869369b6-458f-4de0-9998-ad553c986832	authenticated	authenticated	admin11@gmail.com	$2a$10$a.Ve4Z0cSQdsrtCm.ULRaumJqdPgHOc6Xo7.2vTUcs5AJwbyia4sG	2025-12-07 10:18:56.863286+00	\N		\N		2025-12-07 10:20:16.764345+00			\N	2025-12-07 10:20:20.528087+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Admin 11", "email_verified": true}	\N	2025-12-07 10:18:56.858766+00	2025-12-07 10:20:20.532866+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	fe613134-42cd-4060-b9ff-1378336e5a82	authenticated	authenticated	admin10@gmail.com	$2a$10$5VM4ebzHrEPQDzqtujOM6uWVBE3ezZuK794SxyreE19UqB7qiY9KO	2025-12-07 10:18:21.249294+00	\N		\N		2025-12-07 10:19:37.569678+00			\N	2025-12-07 10:19:42.444747+00	{"provider": "email", "providers": ["email"]}	{"display_name": "Admin 10", "email_verified": true}	\N	2025-12-07 10:18:21.237341+00	2025-12-07 10:19:42.44768+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	24e93a3d-7e6e-4668-909c-1040d73e78c8	authenticated	authenticated	user02@gmail.com	$2a$10$ovxoF2Izzc2ecBLvtDVrC.3HVms7F6UFG6mv3DO8/HF8ZuK3Na6cO	2025-11-28 03:47:06.804145+00	\N		\N		2025-12-06 01:03:52.087377+00			\N	2025-12-06 01:03:55.975395+00	{"provider": "email", "providers": ["email"]}	{"display_name": "User 02", "email_verified": true}	\N	2025-11-28 03:47:06.798763+00	2025-12-06 01:03:55.979619+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	702955d5-d427-404e-8290-d8a3e1fa9294	authenticated	authenticated	user04@gmail.com	$2a$10$DCLnwzSIjBi/88vXhb5gcuvjQuifEFWszeqWL4F9vInaSIvMbBn6i	2025-11-28 07:55:09.455193+00	\N		\N		2025-12-06 01:22:31.37579+00			\N	2025-12-06 01:22:35.378367+00	{"provider": "email", "providers": ["email"]}	{"display_name": "User 0４", "email_verified": true}	\N	2025-11-28 07:55:09.44038+00	2025-12-06 01:22:35.381876+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
5f07c32f-1299-4570-9c42-16e96349cf15	5f07c32f-1299-4570-9c42-16e96349cf15	{"sub": "5f07c32f-1299-4570-9c42-16e96349cf15", "email": "admin@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-23 10:57:35.998341+00	2025-11-23 10:57:35.998489+00	2025-11-23 10:57:35.998489+00	43c9a100-bc73-48a8-a7b6-1ee47e5ba697
3499e15d-8fc7-44ac-8b78-caa1005b9e34	3499e15d-8fc7-44ac-8b78-caa1005b9e34	{"sub": "3499e15d-8fc7-44ac-8b78-caa1005b9e34", "email": "user01@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-23 10:58:20.690841+00	2025-11-23 10:58:20.690906+00	2025-11-23 10:58:20.690906+00	5bc00efa-8976-45b7-a868-96e63eb0478e
43eb1fd3-5d5c-4ae3-8b9a-c921caf32f5d	43eb1fd3-5d5c-4ae3-8b9a-c921caf32f5d	{"sub": "43eb1fd3-5d5c-4ae3-8b9a-c921caf32f5d", "email": "admin01@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-27 17:43:38.801659+00	2025-11-27 17:43:38.801786+00	2025-11-27 17:43:38.801786+00	576858e6-ba12-46a0-a469-a6c997560482
24e93a3d-7e6e-4668-909c-1040d73e78c8	24e93a3d-7e6e-4668-909c-1040d73e78c8	{"sub": "24e93a3d-7e6e-4668-909c-1040d73e78c8", "email": "user02@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-28 03:47:06.801044+00	2025-11-28 03:47:06.801072+00	2025-11-28 03:47:06.801072+00	c38e0236-314d-4d28-a651-35f5cb15b226
0b9b4aa2-3ea3-4526-8caa-91fcd04f36a9	0b9b4aa2-3ea3-4526-8caa-91fcd04f36a9	{"sub": "0b9b4aa2-3ea3-4526-8caa-91fcd04f36a9", "email": "user03@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-28 03:48:37.73334+00	2025-11-28 03:48:37.733373+00	2025-11-28 03:48:37.733373+00	036a6e54-30af-4dff-a5e6-5f0ffe0dd155
702955d5-d427-404e-8290-d8a3e1fa9294	702955d5-d427-404e-8290-d8a3e1fa9294	{"sub": "702955d5-d427-404e-8290-d8a3e1fa9294", "email": "user04@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-11-28 07:55:09.450628+00	2025-11-28 07:55:09.450684+00	2025-11-28 07:55:09.450684+00	855292f0-36e0-413c-a200-164386668e17
6800f5c8-7a03-43a7-9830-bb12e9929d03	6800f5c8-7a03-43a7-9830-bb12e9929d03	{"sub": "6800f5c8-7a03-43a7-9830-bb12e9929d03", "email": "marie@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-02 17:51:06.844117+00	2025-12-02 17:51:06.844151+00	2025-12-02 17:51:06.844151+00	de985866-d011-4e5a-b6c5-fb7021dc8807
41252088-1762-4311-b665-cb56e3da6c65	41252088-1762-4311-b665-cb56e3da6c65	{"sub": "41252088-1762-4311-b665-cb56e3da6c65", "email": "admin02@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-06 06:54:32.327848+00	2025-12-06 06:54:32.327886+00	2025-12-06 06:54:32.327886+00	3250184a-38b3-4039-9428-6dcf7527f63e
fe613134-42cd-4060-b9ff-1378336e5a82	fe613134-42cd-4060-b9ff-1378336e5a82	{"sub": "fe613134-42cd-4060-b9ff-1378336e5a82", "email": "admin10@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-07 10:18:21.24498+00	2025-12-07 10:18:21.245403+00	2025-12-07 10:18:21.245403+00	fefc47eb-9d71-4f1a-9bf7-a81c249336cd
869369b6-458f-4de0-9998-ad553c986832	869369b6-458f-4de0-9998-ad553c986832	{"sub": "869369b6-458f-4de0-9998-ad553c986832", "email": "admin11@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-07 10:18:56.861138+00	2025-12-07 10:18:56.861169+00	2025-12-07 10:18:56.861169+00	cf302138-7147-48a8-b2d3-7d6788b6be5a
\.


--
-- PostgreSQL database dump complete
--

\unrestrict 0aCyZzUDbIaaQJ2aWdbf2vIDAThttWtHh2JUyu5rP3vYO3YHDUTsVRj93bqA4vC

