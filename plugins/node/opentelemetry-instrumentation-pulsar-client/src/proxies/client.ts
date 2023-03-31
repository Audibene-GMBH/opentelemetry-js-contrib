/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type * as Pulsar from 'pulsar-client';
import * as api from '@opentelemetry/api';
import { ProducerProxy } from './producer';
import { ConsumerProxy, wrappedListener } from './consumer';
import {PulsarInstrumentationConfig} from "../types";

export class ClientProxy implements Pulsar.Client {
  private _client: Pulsar.Client;
  private readonly _tracer: api.Tracer;
  private readonly _instrumentationConfig: PulsarInstrumentationConfig;
  private readonly _moduleVersion: undefined | string;

  constructor(
    tracer: api.Tracer,
    instrumentationConfig: PulsarInstrumentationConfig,
    moduleVersion: undefined | string,
    client: Pulsar.Client,
  ) {
    this._tracer = tracer;
    this._instrumentationConfig = instrumentationConfig;
    this._moduleVersion = moduleVersion;
    this._client = client;
  }

  createReader(config: Pulsar.ReaderConfig): Promise<Pulsar.Reader> {
    return this._client.createReader(config);
  }

  async createProducer(
    config: Pulsar.ProducerConfig
  ): Promise<Pulsar.Producer> {
    const producer = await this._client.createProducer(config);
    return new ProducerProxy(
      this._tracer,
      this._instrumentationConfig,
      this._moduleVersion,
      config,
      producer
    );
  }

  async subscribe(config: Pulsar.ConsumerConfig): Promise<Pulsar.Consumer> {
    if (config.listener) {
      config.listener = wrappedListener(
        this._tracer,
        this._instrumentationConfig,
        this._moduleVersion,
        config,
        config.listener
      );
    }
    const consumer = await this._client.subscribe(config);
    return new ConsumerProxy(
      this._tracer,
      this._instrumentationConfig,
      this._moduleVersion,
      config,
      consumer
    );
  }

  // createReader(config: Pulsar.ReaderConfig): Promise<Pulsar.Reader>;
  close(): Promise<null> {
    return this._client.close();
  }
}
