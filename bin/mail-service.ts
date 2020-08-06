#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MailServiceStack } from '../lib/mail-service-stack';

const app = new cdk.App();
new MailServiceStack(app, 'MailServiceStack');
