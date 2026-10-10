#import "NoirlyFlowNative.h"

#import <React/RCTUtils.h>

static NSString *const kSuiteName = @"noirly_flow";

@implementation NoirlyFlowNative {
  RCTPromiseResolveBlock _saveResolve;
  NSURL *_saveTempURL;
}

+ (NSString *)moduleName
{
  return @"NoirlyFlowNative";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeNoirlyFlowNativeSpecJSI>(params);
}

- (NSUserDefaults *)defaults
{
  return [[NSUserDefaults alloc] initWithSuiteName:kSuiteName];
}

#pragma mark - Clipboard

- (void)setClipboard:(NSString *)text
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIPasteboard.generalPasteboard.string = text;
  });
}

#pragma mark - Save as

- (void)saveTextFile:(NSString *)filename
            mimeType:(NSString *)mimeType
            contents:(NSString *)contents
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  if (_saveResolve != nil) {
    reject(@"busy", @"A save is already in progress", nil);
    return;
  }

  // Write to a temp file, then let the user export a copy wherever they like
  // (Files, iCloud Drive, a connected provider).
  NSString *safeName = [filename stringByReplacingOccurrencesOfString:@"/" withString:@"-"];
  NSURL *url = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:safeName]];
  NSError *error = nil;
  if (![contents writeToURL:url atomically:YES encoding:NSUTF8StringEncoding error:&error]) {
    reject(@"save_failed", error.localizedDescription ?: @"Could not write the file", error);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *presenter = RCTPresentedViewController();
    if (presenter == nil) {
      [[NSFileManager defaultManager] removeItemAtURL:url error:nil];
      reject(@"no_activity", @"The app is not in the foreground", nil);
      return;
    }
    UIDocumentPickerViewController *picker =
        [[UIDocumentPickerViewController alloc] initForExportingURLs:@[ url ] asCopy:YES];
    picker.delegate = self;
    picker.modalPresentationStyle = UIModalPresentationFormSheet;
    self->_saveResolve = resolve;
    self->_saveTempURL = url;
    [presenter presentViewController:picker animated:YES completion:nil];
  });
}

- (void)finishSaveWithResult:(id)result
{
  RCTPromiseResolveBlock resolve = _saveResolve;
  _saveResolve = nil;
  if (_saveTempURL != nil) {
    [[NSFileManager defaultManager] removeItemAtURL:_saveTempURL error:nil];
    _saveTempURL = nil;
  }
  if (resolve != nil) {
    resolve(result);
  }
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller
    didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls
{
  [self finishSaveWithResult:urls.firstObject.absoluteString ?: (id)[NSNull null]];
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller
{
  [self finishSaveWithResult:[NSNull null]];
}

#pragma mark - Preferences

- (void)getPreference:(NSString *)key
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  NSString *value = [[self defaults] stringForKey:key];
  resolve(value ?: (id)[NSNull null]);
}

- (void)setPreference:(NSString *)key value:(NSString *)value
{
  [[self defaults] setObject:value forKey:key];
}

- (void)removePreference:(NSString *)key
{
  [[self defaults] removeObjectForKey:key];
}

@end
