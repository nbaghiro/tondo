-- There's no separate Team plan now. Team features become part of the flat Pro plan.
UPDATE "users" SET "plan" = 'pro' WHERE "plan" = 'team';
