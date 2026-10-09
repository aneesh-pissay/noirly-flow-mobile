package com.noirlyflow.nativeutils

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import java.io.IOException
import kotlin.concurrent.thread

@ReactModule(name = NoirlyFlowNativeModule.NAME)
class NoirlyFlowNativeModule(reactContext: ReactApplicationContext) :
  NativeNoirlyFlowNativeSpec(reactContext), ActivityEventListener {

  /** The CSV waiting for the user to pick a location in the save dialog. */
  private var pendingSave: PendingSave? = null

  private class PendingSave(val contents: String, val promise: Promise)

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  private val prefs
    get() = reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  override fun setClipboard(text: String) {
    UiThreadUtil.runOnUiThread {
      val clipboard =
        reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      clipboard.setPrimaryClip(ClipData.newPlainText("Noirly Flow", text))
    }
  }

  override fun saveTextFile(filename: String, mimeType: String, contents: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "The app is not in the foreground")
      return
    }
    if (pendingSave != null) {
      promise.reject("busy", "A save is already in progress")
      return
    }
    // Storage Access Framework: the user picks Downloads, Drive, etc. No
    // storage permission is needed because we only write to the URI we're given.
    val intent =
      Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = mimeType
        putExtra(Intent.EXTRA_TITLE, filename)
      }
    pendingSave = PendingSave(contents, promise)
    UiThreadUtil.runOnUiThread {
      try {
        activity.startActivityForResult(intent, REQUEST_SAVE)
      } catch (error: Exception) {
        pendingSave = null
        promise.reject("save_failed", error.message ?: "Could not open the save dialog", error)
      }
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_SAVE) return
    val pending = pendingSave ?: return
    pendingSave = null
    val uri = data?.data
    if (resultCode != Activity.RESULT_OK || uri == null) {
      pending.promise.resolve(null)
      return
    }
    // Off the main thread: a large export to a cloud provider can be slow.
    thread(name = "noirly-flow-save") {
      try {
        val stream =
          reactApplicationContext.contentResolver.openOutputStream(uri, "wt")
            ?: throw IOException("Could not open the chosen file")
        stream.use { it.write(pending.contents.toByteArray(Charsets.UTF_8)) }
        pending.promise.resolve(uri.toString())
      } catch (error: Exception) {
        pending.promise.reject("save_failed", error.message ?: "Could not write the file", error)
      }
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  override fun getPreference(key: String, promise: Promise) {
    promise.resolve(prefs.getString(key, null))
  }

  override fun setPreference(key: String, value: String) {
    prefs.edit().putString(key, value).apply()
  }

  override fun removePreference(key: String) {
    prefs.edit().remove(key).apply()
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(this)
    pendingSave?.promise?.resolve(null)
    pendingSave = null
    super.invalidate()
  }

  companion object {
    const val NAME = "NoirlyFlowNative"
    private const val PREFS = "noirly_flow"
    private const val REQUEST_SAVE = 0x4E46 // "NF"
  }
}
