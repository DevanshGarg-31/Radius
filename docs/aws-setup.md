# AWS setup (console, step by step)

Everything goes in **one region: `us-east-1` (N. Virginia)**. Check the region picker (top-right of the console) before every step.

Names used below (use these exactly; the backend defaults to them):

| Thing | Name |
|---|---|
| DynamoDB tables | `radius-users`, `radius-projects`, `radius-requests`, `radius-teams` |
| Lambda function | `radius-api` |
| HTTP API | `radius-http-api` |
| S3 bucket | `radius-assets-<something-unique>` |
| OpenSearch domain | `radius-search` |
| Bedrock model | `global.anthropic.claude-sonnet-4-6` |

Order: **0 → 1 → 2 (start it, don't wait) → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10**. After step 7 the whole API works (search falls back to DynamoDB until step 8 is done).

---

## 0. Account safety and budget (10 min)

1. Sign in as root once. **IAM → Dashboard → Add MFA** for root.
2. **IAM → Users → Create user**, one per teammate. Give each one `AdministratorAccess` (hackathon only), with console access. From then on everyone works as their IAM user, not root.
3. **Billing and Cost Management → Budgets → Create budget → Use a template → Monthly cost budget**. Set the amount to `100`. Then **Edit alerts** and add alerts at **10%, 20%, 50% and 80%** of actual cost (that's $10/$20/$50/$80), sent to the team's emails.
4. **Billing → Credits**: check that your credits are active. After step 1 below, come back here the next day. Claude models on Bedrock are billed through AWS Marketplace, and some credit programmes don't cover Marketplace charges.

## 1. Bedrock model access (5 min)

1. Open **Amazon Bedrock** (region `us-east-1`).
2. Go to **Model catalog**, search **Claude Sonnet 4.6**, and open it. Click **Open in playground** and send "hi".
   - If a form asks for **use-case details** (Anthropic first-time use), fill it in and submit. Access is usually granted within minutes.
3. Do the same for **Claude Haiku 4.5** (a cheaper fallback if you ever need one).
4. Go to **Cross-region inference** (left menu). Find **Global Anthropic Claude Sonnet 4.6** and note its **Inference profile ID**. It should be `global.anthropic.claude-sonnet-4-6`. If it's different, use the one shown as `BEDROCK_MODEL_ID` in step 5.

## 2. OpenSearch domain: start it now, it takes 15–30 min

This is optional for the demo to work: until it exists, matching uses the DynamoDB fallback. It is the **only resource that costs money every hour** (about $1/day), so delete it after the hackathon.

1. **Amazon OpenSearch Service → Domains → Create domain**.
2. **Domain name:** `radius-search`. **Domain creation method:** Standard create. **Templates:** Dev/test.
3. **Deployment option:** Domain without standby, **1-AZ**.
4. **Engine:** latest OpenSearch version.
5. **Data nodes:** instance type **`t3.small.search`**, **1 node**. Storage: EBS **gp3**, **10 GiB**.
6. **Dedicated master nodes:** off. **UltraWarm / cold:** off.
7. **Network:** **Public access**.
8. **Fine-grained access control:** **off** (untick it).
9. **Access policy:** choose **Only use domain-level access policy → JSON**. Paste the policy below for now. You'll tighten it in step 8 once the Lambda role exists.
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "AWS": "arn:aws:iam::ACCOUNT_ID:root" },
         "Action": "es:ESHttp*",
         "Resource": "arn:aws:es:us-east-1:ACCOUNT_ID:domain/radius-search/*"
       }
     ]
   }
   ```
   Replace `ACCOUNT_ID` (12 digits, top-right menu). With `...:root` as the principal, any IAM identity in your account that has `es:ESHttp*` permission in its own IAM policy can call the domain. Requests still have to be signed; nothing is open to the public.
10. **Encryption:** leave "Require HTTPS", node-to-node encryption and encryption at rest **on**.
11. **Create**. Carry on with the next steps while it builds.

## 3. DynamoDB tables (10 min)

For each table: **DynamoDB → Tables → Create table**. Enter the name and partition key (type **String**), then under **Table settings** choose **Customize settings**. Set **Capacity mode: On-demand**, and add the global secondary indexes (GSIs) listed. For every index, set **Projected attributes: All**.

| Table name | Partition key | Global secondary indexes (index name → partition key) |
|---|---|---|
| `radius-users` | `userId` | none |
| `radius-projects` | `projectId` | `ownerId-index` → `ownerId` |
| `radius-requests` | `requestId` | `projectId-index` → `projectId`, and `toUserId-index` → `toUserId` |
| `radius-teams` | `teamId` | none |

Index names must match exactly. The code queries them by name.

## 4. S3 bucket for uploads (3 min)

1. **S3 → Create bucket**. Name: `radius-assets-<your-team-name>` (must be globally unique). Region `us-east-1`.
2. Keep **Block all public access: ON**. The bucket stays private; the API hands out short-lived signed URLs.
3. After creating it, open the bucket → **Permissions → Cross-origin resource sharing (CORS) → Edit**, and paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedOrigins": ["http://localhost:3000", "https://*.amplifyapp.com"],
       "ExposeHeaders": []
     }
   ]
   ```

## 5. Lambda function (15 min)

**Build the code first** (on your laptop):
```bash
cd backend
npm ci
npm run build        # creates backend/dist/lambda.zip
```

**Create the function:**
1. **Lambda → Create function → Author from scratch**.
2. **Name:** `radius-api`. **Runtime:** **Node.js 22.x**. **Architecture:** **arm64** (cheaper; the bundle is plain JavaScript).
3. **Permissions:** "Create a new role with basic Lambda permissions". **Create function**.
4. **Code → Upload from → .zip file** → choose `backend/dist/lambda.zip` → **Save**.
5. **Runtime settings → Edit**: set **Handler** to `index.handler`.
6. **Configuration → General configuration → Edit**: **Memory** `512` MB, **Timeout** `0 min 29 sec`.
7. **Configuration → Environment variables → Edit** and add:

   | Key | Value |
   |---|---|
   | `DYNAMODB_USERS_TABLE` | `radius-users` |
   | `DYNAMODB_PROJECTS_TABLE` | `radius-projects` |
   | `DYNAMODB_REQUESTS_TABLE` | `radius-requests` |
   | `DYNAMODB_TEAMS_TABLE` | `radius-teams` |
   | `S3_BUCKET` | your bucket name |
   | `BEDROCK_MODEL_ID` | `global.anthropic.claude-sonnet-4-6` |
   | `BEDROCK_ENABLED` | `true` |
   | `OPENSEARCH_ENDPOINT` | leave empty until step 8 |
   | `CORS_ORIGIN` | `*` (tighten to the Amplify URL later) |
   | `NODE_OPTIONS` | `--enable-source-maps` (readable stack traces in logs) |

   Do **not** add `AWS_REGION`. Lambda sets it automatically, and it's a reserved name.

**Give the function's role access to the other services:**
1. **Configuration → Permissions →** click the role name (something like `radius-api-role-abc123`). It opens in IAM.
2. **Add permissions → Create inline policy → JSON** and paste the policy below. Replace `ACCOUNT_ID` and `BUCKET_NAME`. Name it `radius-api-access`.
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "DynamoDB",
         "Effect": "Allow",
         "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:BatchGetItem"],
         "Resource": [
           "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/radius-*",
           "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/radius-*/index/*"
         ]
       },
       {
         "Sid": "Assets",
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::BUCKET_NAME/*"
       },
       {
         "Sid": "Bedrock",
         "Effect": "Allow",
         "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
         "Resource": [
           "arn:aws:bedrock:*:ACCOUNT_ID:inference-profile/*anthropic.claude-*",
           "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
         ]
       },
       {
         "Sid": "OpenSearch",
         "Effect": "Allow",
         "Action": ["es:ESHttpGet", "es:ESHttpHead", "es:ESHttpPost", "es:ESHttpPut"],
         "Resource": "arn:aws:es:us-east-1:ACCOUNT_ID:domain/radius-search/*"
       }
     ]
   }
   ```
   The Bedrock statement covers the inference profile **and** the underlying model in every region it routes to. If you only allow one of them, calls fail with AccessDenied.
3. Copy the **role ARN** from the top of the role page; you need it in step 8.

**Test it:** in the Lambda console, open **Test**, create an event with this JSON, and click **Test**. The result should show `statusCode: 200`.
```json
{ "version": "2.0", "rawPath": "/health", "headers": {}, "requestContext": { "http": { "method": "GET" }, "requestId": "console-test", "stage": "$default" } }
```

## 6. API Gateway HTTP API (5 min)

1. **API Gateway → Create API → HTTP API → Build**.
2. **Integrations → Add integration → Lambda** → `radius-api` (region `us-east-1`). **API name:** `radius-http-api`. **Next**.
3. **Configure routes:** Method **`ANY`**, Resource path **`/{proxy+}`**, Integration target `radius-api`. **Next**. (One route sends everything to the Lambda; the routing happens in code.)
4. **Stages:** keep **`$default`** with **Auto-deploy on**. **Next → Create**.
5. Left menu **CORS → Configure**:
   - Access-Control-Allow-Origin: `*` for now (later: `http://localhost:3000` and your Amplify URL)
   - Access-Control-Allow-Headers: `content-type,x-user-id`
   - Access-Control-Allow-Methods: `GET,POST,PUT,OPTIONS`
   - **Save**.
6. Copy the **Invoke URL** (for example `https://abc123.execute-api.us-east-1.amazonaws.com`) and open `<Invoke URL>/health` in a browser. You should get `{"ok":true,...}`.

## 7. Load the demo data (5 min)

The easiest way needs no keys on your laptop: **AWS CloudShell** (the `>_` icon in the console's top bar, region `us-east-1`).
```bash
node -v                                   # needs v20+. If older: nvm install 22 && nvm use 22
git clone https://github.com/DevanshGarg-31/Radius.git
cd Radius/backend
npm ci
cp .env.example .env                      # table names already match; set OPENSEARCH_ENDPOINT after step 8
npm run seed
```
You should see "wrote 25 users / 12 projects / 12 teams". Check `<Invoke URL>/users`. It's safe to re-run.

Now the whole flow works through the API: create project → analyze (Bedrock) → matches (DynamoDB search) → invite → accept → team → team gaps.

## 8. Connect OpenSearch (after the domain says "Active")

1. **OpenSearch Service → Domains → radius-search**. Copy the **Domain endpoint (IPv4)** (`https://search-radius-search-xxxx.us-east-1.es.amazonaws.com`).
2. Optional hardening: **Security configuration → Edit → access policy**. Replace the `...:root` principal with the Lambda **role ARN** from step 5 plus the ARN of the IAM user you run CloudShell as (IAM → Users → you → ARN).
3. In **CloudShell**, add the endpoint to the backend's `.env` file:
   ```bash
   cd ~/Radius/backend
   sed -i "s#^OPENSEARCH_ENDPOINT=.*#OPENSEARCH_ENDPOINT=https://search-radius-search-xxxx.us-east-1.es.amazonaws.com#" .env
   npm run create-indices
   npm run seed                           # now also indexes users and projects
   ```
4. **Lambda → radius-api → Configuration → Environment variables** → set `OPENSEARCH_ENDPOINT` to the same URL → **Save**.
5. Check it: a `/projects/{id}/matches` response should now say `"searchMeta": { "source": "opensearch", ... }`.

## 9. Amplify: host the Next.js frontend (10 min)

1. **AWS Amplify → Create new app → GitHub** → authorise → repository `DevanshGarg-31/Radius`, branch `main`.
2. Tick **"My app is a monorepo"**, **App root directory:** `frontend`.
3. Amplify detects **Next.js (SSR)** and fills in the build settings. Keep them.
4. **Advanced settings → Environment variables:** `NEXT_PUBLIC_API_BASE_URL` = your API Invoke URL (no trailing slash).
5. **Save and deploy**. The app URL looks like `https://main.d1234abcd.amplifyapp.com`.
6. Put that URL in the **API Gateway CORS** allowed origins (step 6.5), in `CORS_ORIGIN` on the Lambda, and in the S3 bucket CORS. It's already covered by `https://*.amplifyapp.com` there.

If the build fails on the Next.js version, add `output: "export"` to `frontend/next.config.ts` (the app calls the API from the browser, so a static export works) and redeploy.

## 10. CloudWatch: logs, dashboard, alarm (10 min)

1. **CloudWatch → Log groups → `/aws/lambda/radius-api` → Actions → Edit retention → 2 weeks**.
2. **Dashboards → Create dashboard** `Radius` and add these widgets:
   - **Line**, Lambda → By function name → `radius-api`: **Invocations**, **Errors**, **Duration (p95)**.
   - **Line**, ApiGateway → By Api → `radius-http-api`: **4xx**, **5xx**, **Latency**.
   - **Line**, Custom namespace **`Radius`**: **BedrockLatencyMs** (by `Task`), **OpenSearchTookMs**, **CandidatesScored**, **BedrockFallbacks**. These appear after the first few API calls.
   - **Logs table**, Logs Insights on `/aws/lambda/radius-api`:
     ```
     fields @timestamp, route, status, durationMs, userId
     | filter msg = "request"
     | sort @timestamp desc
     | limit 50
     ```
3. **Alarms → Create alarm** → metric Lambda `radius-api` **Errors** → Sum over 5 min ≥ 1 → notify a new SNS topic with your email (confirm the email it sends).

Show this dashboard in the demo video's architecture section.

---

## Deploying backend changes

```bash
cd backend
npm test && npm run build
```
Then **Lambda → radius-api → Code → Upload from → .zip file → `dist/lambda.zip`**.
(With the AWS CLI installed and configured, `npm run deploy` does the same.)

## Cost notes

| Service | Expected cost |
|---|---|
| OpenSearch `t3.small.search` | about $1/day while it exists. **The main cost.** |
| Bedrock (Sonnet 4.6) | a few cents per demo run (≤ 3 calls per project) |
| Lambda, API Gateway, DynamoDB on-demand, S3, CloudWatch | pennies at hackathon traffic |
| Amplify | small build-minute and hosting charges |

## Teardown after the hackathon

Delete the resources in this order: **OpenSearch domain** first, then the Amplify app, API Gateway API, Lambda function, the four DynamoDB tables, the S3 bucket (empty it first), and the Lambda log group.
